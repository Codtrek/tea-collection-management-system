import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react-native';

import { authService, estateService, routeService } from '@/services';

import { CreateRouteScreen } from '../CreateRouteScreen';

jest.mock('@/services', () => ({
  authService: { getDemoAccounts: jest.fn() },
  estateService: { listEstates: jest.fn() },
  routeService: { createRoute: jest.fn() },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockPush(...args) },
}));

const collectors = [{ id: 'collector-1', name: 'Kamal Silva', phone: '0770000003', role: 'collector' as const }];
const estates = [
  { id: 'estate-1', ownerId: 'owner-1', name: 'Green Valley Estate' },
  { id: 'estate-2', ownerId: 'owner-1', name: 'Highland Tea Gardens' },
];

beforeEach(() => {
  jest.clearAllMocks();
  (authService.getDemoAccounts as jest.Mock).mockResolvedValue(collectors);
  (estateService.listEstates as jest.Mock).mockResolvedValue(estates);
});

afterEach(() => {
  cleanup();
});

test('submit is disabled until a collector and at least one stop are selected', async () => {
  render(<CreateRouteScreen />);
  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());

  expect(screen.getByRole('button', { name: 'Create Route' }).props.accessibilityState?.disabled).toBe(true);
});

test('creates a route with the selected collector and estate stops', async () => {
  (routeService.createRoute as jest.Mock).mockResolvedValue({ id: 'route-1' });

  render(<CreateRouteScreen />);
  await waitFor(() => expect(screen.getByText('Green Valley Estate')).toBeTruthy());

  fireEvent.press(screen.getByText('Kamal Silva'));
  fireEvent.press(screen.getByText('Green Valley Estate'));

  await waitFor(() => expect(screen.getByRole('button', { name: 'Create Route' }).props.accessibilityState?.disabled).toBe(false));
  fireEvent.press(screen.getByText('Create Route'));

  await waitFor(() =>
    expect(routeService.createRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        collectorId: 'collector-1',
        stops: [{ estateId: 'estate-1', hasTeaPickup: true, hasFertilizerDelivery: false }],
      }),
    ),
  );
  expect(mockPush).toHaveBeenCalledWith('/(app)/routes/route-1');
});
