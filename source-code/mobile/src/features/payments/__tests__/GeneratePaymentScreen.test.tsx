import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { estateService, factoryService, paymentService } from '@/services';
import { useAuthStore } from '@/store/authStore';

import { GeneratePaymentScreen } from '../GeneratePaymentScreen';

jest.mock('@/services', () => ({
  paymentService: { generateForMonth: jest.fn(), listAll: jest.fn(), finalize: jest.fn() },
  estateService: { listEstates: jest.fn() },
  factoryService: { listFactories: jest.fn() },
}));

const adminUser = { id: 'admin-1', name: 'Factory Admin', phone: '0770000005', role: 'factory_admin' as const };

const estate = { id: 'estate-1', ownerId: 'owner-1', name: 'Green Valley Estate' };

const generatedPayment = {
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
  status: 'pending' as const,
  finalizedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: adminUser });
  (estateService.listEstates as jest.Mock).mockResolvedValue([estate]);
  (factoryService.listFactories as jest.Mock).mockResolvedValue([{ id: 'factory-1', name: 'Nuwara Eliya Tea Factory' }]);
  (paymentService.listAll as jest.Mock).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

test('generate is disabled until an estate, month, and rates are provided', async () => {
  render(<GeneratePaymentScreen />);

  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Generate Payment' }).props.accessibilityState?.disabled).toBe(true);
});

test('generating calls the service and shows the new payment', async () => {
  (paymentService.generateForMonth as jest.Mock).mockResolvedValue({ ok: true, payment: generatedPayment });

  render(<GeneratePaymentScreen />);
  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());

  fireEvent.press(screen.getByText('Green Valley Estate'));
  await waitFor(() => expect(screen.getByText('Selected')).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/YYYY-MM/), '2026-07');
  await waitFor(() => expect(screen.getByDisplayValue('2026-07')).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/super rate/i), '200');
  await waitFor(() => expect(screen.getByDisplayValue('200')).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/normal rate/i), '150');
  await waitFor(() => expect(screen.getByDisplayValue('150')).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/transport rate/i), '5');
  await waitFor(() => expect(screen.getByDisplayValue('5')).toBeTruthy());
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Generate Payment' }).props.accessibilityState?.disabled).toBe(false),
  );

  fireEvent.press(screen.getByText('Generate Payment'));

  await waitFor(() =>
    expect(paymentService.generateForMonth).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      factoryId: 'factory-1',
      paymentMonth: '2026-07',
      superRatePerKg: 200,
      normalRatePerKg: 150,
      transportRatePerKg: 5,
    }),
  );
  await waitFor(() => expect(screen.getByText(/Net: Rs 26997/)).toBeTruthy());
});

test('shows the service error when generation fails', async () => {
  (paymentService.generateForMonth as jest.Mock).mockResolvedValue({
    ok: false,
    error: 'No received tea collections found for this month.',
  });

  render(<GeneratePaymentScreen />);
  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());

  fireEvent.press(screen.getByText('Green Valley Estate'));
  await waitFor(() => expect(screen.getByText('Selected')).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/YYYY-MM/), '2026-07');
  await waitFor(() => expect(screen.getByDisplayValue('2026-07')).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/super rate/i), '200');
  await waitFor(() => expect(screen.getByDisplayValue('200')).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/normal rate/i), '150');
  await waitFor(() => expect(screen.getByDisplayValue('150')).toBeTruthy());
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Generate Payment' }).props.accessibilityState?.disabled).toBe(false),
  );

  fireEvent.press(screen.getByText('Generate Payment'));

  await waitFor(() => expect(screen.getByText('No received tea collections found for this month.')).toBeTruthy());
});

test('finalizes a pending payment', async () => {
  (paymentService.listAll as jest.Mock).mockResolvedValue([generatedPayment]);
  (paymentService.finalize as jest.Mock).mockResolvedValue({
    ok: true,
    payment: { ...generatedPayment, status: 'finalized', finalizedAt: '2026-07-31T10:00:00.000Z' },
  });

  render(<GeneratePaymentScreen />);
  await waitFor(() => expect(screen.getByText('Finalize')).toBeTruthy());

  fireEvent.press(screen.getByText('Finalize'));

  await waitFor(() => expect(paymentService.finalize).toHaveBeenCalledWith('payment-1'));
  await waitFor(() => expect(screen.getByText(/finalized/)).toBeTruthy());
});
