import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react-native';

import { useAuthStore } from '@/store/authStore';
import { routeService } from '@/services';

import { RouteListScreen } from '../RouteListScreen';

jest.mock('@/services', () => ({
  routeService: {
    listRoutesForCollector: jest.fn(),
    listRoutesForDate: jest.fn(),
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

const collectorUser = { id: 'collector-1', name: 'Kamal Silva', phone: '0770000003', role: 'collector' as const };
const adminUser = { id: 'admin-1', name: 'Ruwan Bandara', phone: '0770000005', role: 'factory_admin' as const };

const sampleRoute = {
  id: 'route-1',
  routeDate: '2026-07-10',
  collectorId: 'collector-1',
  truckName: 'Truck A',
  driverName: 'Sena',
  status: 'scheduled' as const,
  statusReason: null,
  startedAt: null,
  completedAt: null,
  stops: [
    {
      id: 'stop-1',
      routeId: 'route-1',
      estateId: 'estate-1',
      estateName: 'Green Valley Estate',
      stopOrder: 0,
      hasTeaPickup: true,
      hasFertilizerDelivery: false,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: collectorUser });
});

afterEach(() => {
  cleanup();
});

test('shows an empty state when the collector has no route today', async () => {
  (routeService.listRoutesForCollector as jest.Mock).mockResolvedValue([]);

  render(<RouteListScreen />);

  await waitFor(() => expect(screen.getByText('No route scheduled')).toBeTruthy());
});

test("lists the collector's route for today", async () => {
  (routeService.listRoutesForCollector as jest.Mock).mockResolvedValue([sampleRoute]);

  render(<RouteListScreen />);

  await waitFor(() => expect(screen.getByText('Truck A')).toBeTruthy());
  expect(screen.getByText(/scheduled/i)).toBeTruthy();
});

test('tapping a route navigates to its detail screen', async () => {
  (routeService.listRoutesForCollector as jest.Mock).mockResolvedValue([sampleRoute]);
  render(<RouteListScreen />);
  await waitFor(() => expect(screen.getByText('Truck A')).toBeTruthy());

  fireEvent.press(screen.getByText('Truck A'));

  expect(mockPush).toHaveBeenCalledWith('/(app)/routes/route-1');
});

test('factory admin sees a "New Route" action and today\'s routes for all collectors', async () => {
  useAuthStore.setState({ user: adminUser });
  (routeService.listRoutesForDate as jest.Mock).mockResolvedValue([sampleRoute]);

  render(<RouteListScreen />);

  await waitFor(() => expect(screen.getByText('Truck A')).toBeTruthy());
  fireEvent.press(screen.getByText(/new route/i));
  expect(mockPush).toHaveBeenCalledWith('/(app)/routes/new');
});
