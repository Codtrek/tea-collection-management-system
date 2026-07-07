import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { collectionService, factoryService } from '@/services';
import { useAuthStore } from '@/store/authStore';

import { ReceivingScreen } from '../ReceivingScreen';

jest.mock('@/services', () => ({
  collectionService: { listPendingReceiving: jest.fn(), receiveAtFactory: jest.fn() },
  factoryService: { listFactories: jest.fn() },
}));

const officerUser = { id: 'officer-1', name: 'Ruwan Perera', phone: '0770000004', role: 'receiving_officer' as const };

const pendingRecord = {
  id: 'collection-1',
  pickupRequestId: null,
  routeStopId: null,
  collectorId: 'collector-1',
  estateId: 'estate-1',
  estateName: 'Green Valley Estate',
  actualWeightKg: 100,
  selfDelivered: false,
  ownerConfirmed: true,
  evidenceUrl: null,
  collectedAt: '2026-07-07T06:00:00.000Z',
  receiving: null,
};

const receivedRecord = {
  ...pendingRecord,
  receiving: {
    id: 'receiving-1',
    collectionRecordId: 'collection-1',
    receivingOfficerId: 'officer-1',
    factoryId: 'factory-1',
    receivedWeightKg: 99,
    teaGrade: 'super' as const,
    receivedAt: '2026-07-07T09:00:00.000Z',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: officerUser });
  (factoryService.listFactories as jest.Mock).mockResolvedValue([{ id: 'factory-1', name: 'Nuwara Eliya Tea Factory' }]);
});

afterEach(() => {
  cleanup();
});

test('shows an empty state when nothing is pending', async () => {
  (collectionService.listPendingReceiving as jest.Mock).mockResolvedValue([]);

  render(<ReceivingScreen />);

  await waitFor(() => expect(screen.getByText('No collections awaiting receiving')).toBeTruthy());
});

test('lists pending collection records with collected weight', async () => {
  (collectionService.listPendingReceiving as jest.Mock).mockResolvedValue([pendingRecord]);

  render(<ReceivingScreen />);

  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());
  expect(screen.getByText(/100 kg/)).toBeTruthy();
  expect(screen.getByText('Receive')).toBeTruthy();
});

test('receiving requires weight and grade, then submits and removes the record', async () => {
  (collectionService.listPendingReceiving as jest.Mock).mockResolvedValue([pendingRecord]);
  (collectionService.receiveAtFactory as jest.Mock).mockResolvedValue({
    ok: true,
    record: receivedRecord,
    complaint: null,
  });

  render(<ReceivingScreen />);
  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());

  fireEvent.press(screen.getByText('Receive'));
  await waitFor(() => expect(screen.getByPlaceholderText(/weight/i)).toBeTruthy());

  fireEvent.changeText(screen.getByPlaceholderText(/weight/i), '99');
  await waitFor(() => expect(screen.getByDisplayValue('99')).toBeTruthy());
  fireEvent.press(screen.getByText('Super'));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Confirm Receiving' }).props.accessibilityState?.disabled).toBe(false),
  );

  fireEvent.press(screen.getByText('Confirm Receiving'));

  await waitFor(() =>
    expect(collectionService.receiveAtFactory).toHaveBeenCalledWith({
      collectionRecordId: 'collection-1',
      receivingOfficerId: 'officer-1',
      factoryId: 'factory-1',
      receivedWeightKg: 99,
      teaGrade: 'super',
    }),
  );
  await waitFor(() => expect(screen.getByText('No collections awaiting receiving')).toBeTruthy());
});

test('shows a mismatch notice when a complaint is auto-raised', async () => {
  (collectionService.listPendingReceiving as jest.Mock).mockResolvedValue([pendingRecord]);
  (collectionService.receiveAtFactory as jest.Mock).mockResolvedValue({
    ok: true,
    record: { ...receivedRecord, receiving: { ...receivedRecord.receiving, receivedWeightKg: 90, teaGrade: 'normal' } },
    complaint: {
      id: 'complaint-1',
      type: 'weight_mismatch',
      raisedByUserId: 'officer-1',
      collectionRecordId: 'collection-1',
      description: 'Collected weight 100kg differs from factory weight 90kg for estate Green Valley Estate',
      status: 'open',
      createdAt: '2026-07-07T09:00:00.000Z',
    },
  });

  render(<ReceivingScreen />);
  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());

  fireEvent.press(screen.getByText('Receive'));
  await waitFor(() => expect(screen.getByPlaceholderText(/weight/i)).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/weight/i), '90');
  await waitFor(() => expect(screen.getByDisplayValue('90')).toBeTruthy());
  fireEvent.press(screen.getByText('Normal'));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Confirm Receiving' }).props.accessibilityState?.disabled).toBe(false),
  );

  fireEvent.press(screen.getByText('Confirm Receiving'));

  await waitFor(() => expect(screen.getByText(/Weight mismatch complaint raised/)).toBeTruthy());
});
