import { cleanup, render, screen, waitFor } from '@testing-library/react-native';

import { paymentService } from '@/services';
import { useAuthStore } from '@/store/authStore';

import { PaymentStatementsScreen } from '../PaymentStatementsScreen';

jest.mock('@/services', () => ({
  paymentService: { listForOwner: jest.fn() },
}));

const ownerUser = { id: 'owner-1', name: 'Nimal Perera', phone: '0770000001', role: 'estate_owner' as const };

const payment = {
  id: 'payment-1',
  ownerId: 'owner-1',
  factoryId: 'factory-1',
  paymentMonth: '2026-07',
  superWeightKg: 100,
  normalWeightKg: 50,
  grossAmount: 27500,
  transportCost: 500,
  fertilizerDeductions: 0,
  advanceDeductions: 0,
  bankTransferFee: 3,
  netAmount: 26997,
  status: 'finalized' as const,
  finalizedAt: '2026-07-31T10:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: ownerUser });
});

afterEach(() => {
  cleanup();
});

test('shows an empty state when there are no statements', async () => {
  (paymentService.listForOwner as jest.Mock).mockResolvedValue([]);

  render(<PaymentStatementsScreen />);

  await waitFor(() => expect(screen.getByText('No payment statements yet')).toBeTruthy());
});

test('lists monthly statements with the payment breakdown', async () => {
  (paymentService.listForOwner as jest.Mock).mockResolvedValue([payment]);

  render(<PaymentStatementsScreen />);

  await waitFor(() => expect(screen.getByText('2026-07')).toBeTruthy());
  expect(screen.getByText(/Super: 100 kg/)).toBeTruthy();
  expect(screen.getByText(/Normal: 50 kg/)).toBeTruthy();
  expect(screen.getByText(/Gross: Rs 27500/)).toBeTruthy();
  expect(screen.getByText(/Net: Rs 26997/)).toBeTruthy();
  expect(screen.getByText(/finalized/)).toBeTruthy();
  expect(paymentService.listForOwner).toHaveBeenCalledWith('owner-1');
});
