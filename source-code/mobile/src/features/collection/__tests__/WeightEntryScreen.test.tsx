import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { collectionService, estateService, evidenceSyncService } from '@/services';
import { useAuthStore } from '@/store/authStore';

import { WeightEntryScreen } from '../WeightEntryScreen';

jest.mock('@/services', () => ({
  collectionService: { createRecord: jest.fn(), confirmOwner: jest.fn(), listForCollector: jest.fn() },
  estateService: { listEstates: jest.fn() },
  evidenceSyncService: { captureEvidence: jest.fn(), flushQueue: jest.fn() },
}));

const collectorUser = { id: 'collector-1', name: 'Kamal Silva', phone: '0770000003', role: 'collector' as const };

const estate = { id: 'estate-1', ownerId: 'owner-1', name: 'Green Valley Estate' };

const savedRecord = {
  id: 'collection-1',
  pickupRequestId: null,
  routeStopId: null,
  collectorId: 'collector-1',
  estateId: 'estate-1',
  estateName: 'Green Valley Estate',
  actualWeightKg: 42.5,
  selfDelivered: false,
  ownerConfirmed: false,
  evidenceUrl: null,
  evidenceStatus: 'none' as const,
  collectedAt: '2026-07-07T06:00:00.000Z',
  receiving: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: collectorUser });
  (estateService.listEstates as jest.Mock).mockResolvedValue([estate]);
  (collectionService.listForCollector as jest.Mock).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

test('save is disabled until an estate is selected and a weight is entered', async () => {
  render(<WeightEntryScreen />);

  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Save Record' }).props.accessibilityState?.disabled).toBe(true);
});

test('saving creates a collection record and lists it', async () => {
  (collectionService.createRecord as jest.Mock).mockResolvedValue({ ok: true, record: savedRecord });

  render(<WeightEntryScreen />);
  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());

  fireEvent.press(screen.getByText('Green Valley Estate'));
  await waitFor(() => expect(screen.getByText('Selected')).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/weight/i), '42.5');
  await waitFor(() => expect(screen.getByDisplayValue('42.5')).toBeTruthy());
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save Record' }).props.accessibilityState?.disabled).toBe(false),
  );

  fireEvent.press(screen.getByText('Save Record'));

  await waitFor(() =>
    expect(collectionService.createRecord).toHaveBeenCalledWith({
      collectorId: 'collector-1',
      estateId: 'estate-1',
      actualWeightKg: 42.5,
    }),
  );
  await waitFor(() => expect(screen.getByText(/42.5 kg/)).toBeTruthy());
});

test('owner can confirm a saved record on the device', async () => {
  (collectionService.listForCollector as jest.Mock).mockResolvedValue([savedRecord]);
  (collectionService.confirmOwner as jest.Mock).mockResolvedValue({
    ok: true,
    record: { ...savedRecord, ownerConfirmed: true },
  });

  render(<WeightEntryScreen />);
  await waitFor(() => expect(screen.getByText('Owner Confirm')).toBeTruthy());

  fireEvent.press(screen.getByText('Owner Confirm'));

  await waitFor(() => expect(collectionService.confirmOwner).toHaveBeenCalledWith('collection-1'));
  await waitFor(() => expect(screen.getByText('Confirmed by owner')).toBeTruthy());
});

test('capturing evidence while online shows the uploaded status', async () => {
  (collectionService.listForCollector as jest.Mock).mockResolvedValue([savedRecord]);
  (evidenceSyncService.captureEvidence as jest.Mock).mockResolvedValue({ ok: true, status: 'uploaded' });

  render(<WeightEntryScreen />);
  await waitFor(() => expect(screen.getByText('Add Evidence Photo')).toBeTruthy());

  fireEvent.press(screen.getByText('Add Evidence Photo'));

  await waitFor(() => expect(evidenceSyncService.captureEvidence).toHaveBeenCalledWith('collection-1', expect.any(String)));
  await waitFor(() => expect(screen.getByText('Evidence uploaded')).toBeTruthy());
});

test('capturing evidence while offline shows the queued status', async () => {
  (collectionService.listForCollector as jest.Mock).mockResolvedValue([savedRecord]);
  (evidenceSyncService.captureEvidence as jest.Mock).mockResolvedValue({ ok: true, status: 'queued_offline' });

  render(<WeightEntryScreen />);
  await waitFor(() => expect(screen.getByText('Add Evidence Photo')).toBeTruthy());

  fireEvent.press(screen.getByText('Add Evidence Photo'));

  await waitFor(() => expect(screen.getByText(/Evidence queued.*upload when back online/)).toBeTruthy());
});

test('shows the service error when saving fails', async () => {
  (collectionService.createRecord as jest.Mock).mockResolvedValue({
    ok: false,
    error: 'Weight must be greater than zero',
  });

  render(<WeightEntryScreen />);
  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());

  fireEvent.press(screen.getByText('Green Valley Estate'));
  await waitFor(() => expect(screen.getByText('Selected')).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/weight/i), '5');
  await waitFor(() => expect(screen.getByDisplayValue('5')).toBeTruthy());
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save Record' }).props.accessibilityState?.disabled).toBe(false),
  );

  fireEvent.press(screen.getByText('Save Record'));

  await waitFor(() => expect(screen.getByText('Weight must be greater than zero')).toBeTruthy());
});
