import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react-native';

import { useAuthStore } from '@/store/authStore';
import { pickupService } from '@/services';

import { PickupRequestListScreen } from '../PickupRequestListScreen';

jest.mock('@/services', () => ({
  pickupService: { listForCollector: jest.fn(), accept: jest.fn(), decline: jest.fn() },
}));

const collectorUser = { id: 'collector-1', name: 'Kamal Silva', phone: '0770000003', role: 'collector' as const };

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
  useAuthStore.setState({ user: collectorUser });
});

afterEach(() => {
  cleanup();
});

test('shows an empty state when there are no pending requests', async () => {
  (pickupService.listForCollector as jest.Mock).mockResolvedValue([]);

  render(<PickupRequestListScreen />);

  await waitFor(() => expect(screen.getByText('No pickup requests')).toBeTruthy());
});

test('lists pending requests with accept/decline actions', async () => {
  (pickupService.listForCollector as jest.Mock).mockResolvedValue([pendingRequest]);

  render(<PickupRequestListScreen />);

  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());
  expect(screen.getByText('Accept')).toBeTruthy();
  expect(screen.getByText('Decline')).toBeTruthy();
});

test('accepting removes the request from the pending list', async () => {
  (pickupService.listForCollector as jest.Mock).mockResolvedValue([pendingRequest]);
  (pickupService.accept as jest.Mock).mockResolvedValue({ ok: true, request: { ...pendingRequest, status: 'accepted' } });

  render(<PickupRequestListScreen />);
  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());

  fireEvent.press(screen.getByText('Accept'));

  await waitFor(() => expect(screen.getByText('No pickup requests')).toBeTruthy());
  expect(pickupService.accept).toHaveBeenCalledWith('pickup-1');
});

test('declining requires a reason before confirming', async () => {
  (pickupService.listForCollector as jest.Mock).mockResolvedValue([pendingRequest]);
  (pickupService.decline as jest.Mock).mockResolvedValue({ ok: true, request: { ...pendingRequest, status: 'cancelled' } });

  render(<PickupRequestListScreen />);
  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());

  fireEvent.press(screen.getByText('Decline'));
  await waitFor(() => expect(screen.getByPlaceholderText(/reason/i)).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/reason/i), 'Truck full');
  await waitFor(() => expect(screen.getByDisplayValue('Truck full')).toBeTruthy());
  fireEvent.press(screen.getByText('Confirm'));

  await waitFor(() => expect(pickupService.decline).toHaveBeenCalledWith('pickup-1', 'Truck full'));
});
