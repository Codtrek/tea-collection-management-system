import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react-native';

import { useAuthStore } from '@/store/authStore';
import { factoryService, pickupService } from '@/services';

import { PickupRequestScreen } from '../PickupRequestScreen';

jest.mock('@/services', () => ({
  factoryService: { listFactories: jest.fn() },
  pickupService: { getActiveRequestForEstate: jest.fn(), createRequest: jest.fn(), cancel: jest.fn() },
}));

const ownerUser = { id: 'owner-1', name: 'Nimal Perera', phone: '0770000001', role: 'estate_owner' as const };

const factories = [{ id: 'factory-1', name: 'Nuwara Eliya Tea Factory' }];

const pendingRequest = {
  id: 'pickup-1',
  estateId: 'estate-1',
  estateName: 'Green Valley Estate',
  ownerId: 'owner-1',
  factoryId: 'factory-1',
  routeStopId: 'stop-1',
  requestDate: '2026-07-10',
  status: 'pending' as const,
  declineReason: null,
  estimatedWeightKg: null,
  gpsPinLat: null,
  gpsPinLng: null,
  requestedAt: '2026-07-10T05:00:00.000Z',
  resolvedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: ownerUser });
  (factoryService.listFactories as jest.Mock).mockResolvedValue(factories);
});

afterEach(() => {
  cleanup();
});

test('shows the create form when there is no active request', async () => {
  (pickupService.getActiveRequestForEstate as jest.Mock).mockResolvedValue(null);

  render(<PickupRequestScreen estateId="estate-1" />);

  await waitFor(() => expect(screen.getByText('Nuwara Eliya Tea Factory')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Request Pickup' }).props.accessibilityState?.disabled).toBe(true);
});

test('submits a request for the selected factory', async () => {
  (pickupService.getActiveRequestForEstate as jest.Mock).mockResolvedValue(null);
  (pickupService.createRequest as jest.Mock).mockResolvedValue({ ok: true, request: pendingRequest });

  render(<PickupRequestScreen estateId="estate-1" />);
  await waitFor(() => expect(screen.getByText('Nuwara Eliya Tea Factory')).toBeTruthy());

  fireEvent.press(screen.getByText('Nuwara Eliya Tea Factory'));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Request Pickup' }).props.accessibilityState?.disabled).toBe(false),
  );
  fireEvent.press(screen.getByRole('button', { name: 'Request Pickup' }));

  await waitFor(() => expect(screen.getByText(/pending/i)).toBeTruthy());
  expect(pickupService.createRequest).toHaveBeenCalledWith(
    expect.objectContaining({ estateId: 'estate-1', ownerId: 'owner-1', factoryId: 'factory-1' }),
  );
});

test('shows the error when no collector is currently active', async () => {
  (pickupService.getActiveRequestForEstate as jest.Mock).mockResolvedValue(null);
  (pickupService.createRequest as jest.Mock).mockResolvedValue({
    ok: false,
    error: 'No collector is currently active on your estate route. Try again once your route starts.',
  });

  render(<PickupRequestScreen estateId="estate-1" />);
  await waitFor(() => expect(screen.getByText('Nuwara Eliya Tea Factory')).toBeTruthy());
  fireEvent.press(screen.getByText('Nuwara Eliya Tea Factory'));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Request Pickup' }).props.accessibilityState?.disabled).toBe(false),
  );
  fireEvent.press(screen.getByRole('button', { name: 'Request Pickup' }));

  await waitFor(() => expect(screen.getByText(/no collector is currently active/i)).toBeTruthy());
});

test('shows existing request status and a cancel action instead of the form', async () => {
  (pickupService.getActiveRequestForEstate as jest.Mock).mockResolvedValue(pendingRequest);

  render(<PickupRequestScreen estateId="estate-1" />);

  await waitFor(() => expect(screen.getByText(/pending/i)).toBeTruthy());
  expect(screen.queryByText('Nuwara Eliya Tea Factory')).toBeNull();
  expect(screen.getByText('Cancel Request')).toBeTruthy();
});

test('cancelling clears the request and shows the form again', async () => {
  (pickupService.getActiveRequestForEstate as jest.Mock).mockResolvedValue(pendingRequest);
  (pickupService.cancel as jest.Mock).mockResolvedValue({ ok: true, request: { ...pendingRequest, status: 'cancelled' } });

  render(<PickupRequestScreen estateId="estate-1" />);
  await waitFor(() => expect(screen.getByText('Cancel Request')).toBeTruthy());

  fireEvent.press(screen.getByText('Cancel Request'));

  await waitFor(() => expect(screen.getByText('Nuwara Eliya Tea Factory')).toBeTruthy());
});
