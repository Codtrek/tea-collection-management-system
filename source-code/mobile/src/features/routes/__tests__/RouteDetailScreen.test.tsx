import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react-native';

import { useAuthStore } from '@/store/authStore';
import { routeService } from '@/services';

import { RouteDetailScreen } from '../RouteDetailScreen';

jest.mock('@/services', () => ({
  routeService: {
    listRoutesForDate: jest.fn(),
    listRoutesForCollector: jest.fn(),
    startRoute: jest.fn(),
    setDelayed: jest.fn(),
    setCancelled: jest.fn(),
    completeRoute: jest.fn(),
  },
}));

const collectorUser = { id: 'collector-1', name: 'Kamal Silva', phone: '0770000003', role: 'collector' as const };
const adminUser = { id: 'admin-1', name: 'Ruwan Bandara', phone: '0770000005', role: 'factory_admin' as const };

const scheduledRoute = {
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
});

afterEach(() => {
  cleanup();
});

test('collector sees a Start Route button for their own scheduled route', async () => {
  useAuthStore.setState({ user: collectorUser });

  render(<RouteDetailScreen route={scheduledRoute} />);

  await waitFor(() => expect(screen.getByText('Start Route')).toBeTruthy());
});

test('pressing Start Route calls the service and shows the updated status', async () => {
  useAuthStore.setState({ user: collectorUser });
  (routeService.startRoute as jest.Mock).mockResolvedValue({
    ok: true,
    route: { ...scheduledRoute, status: 'active', startedAt: '2026-07-10T08:00:00.000Z' },
  });

  render(<RouteDetailScreen route={scheduledRoute} />);
  await waitFor(() => expect(screen.getByText('Start Route')).toBeTruthy());

  fireEvent.press(screen.getByText('Start Route'));

  await waitFor(() => expect(screen.getByText(/active/i)).toBeTruthy());
  expect(routeService.startRoute).toHaveBeenCalledWith('route-1', 'collector-1');
});

test('factory admin can delay a route after entering a reason', async () => {
  useAuthStore.setState({ user: adminUser });
  (routeService.setDelayed as jest.Mock).mockResolvedValue({
    ok: true,
    route: { ...scheduledRoute, status: 'delayed', statusReason: 'Heavy rain' },
  });

  render(<RouteDetailScreen route={scheduledRoute} />);
  await waitFor(() => expect(screen.getByText('Delay Route')).toBeTruthy());

  fireEvent.press(screen.getByText('Delay Route'));
  await waitFor(() => expect(screen.getByPlaceholderText(/reason/i)).toBeTruthy());
  fireEvent.changeText(screen.getByPlaceholderText(/reason/i), 'Heavy rain');
  await waitFor(() => expect(screen.getByDisplayValue('Heavy rain')).toBeTruthy());
  fireEvent.press(screen.getByText('Confirm'));

  await waitFor(() => expect(routeService.setDelayed).toHaveBeenCalledWith('route-1', 'Heavy rain'));
  expect(screen.getByText(/delayed/i)).toBeTruthy();
});

test('does not show factory actions to a collector', async () => {
  useAuthStore.setState({ user: collectorUser });

  render(<RouteDetailScreen route={scheduledRoute} />);

  await waitFor(() => expect(screen.getByText('Start Route')).toBeTruthy());
  expect(screen.queryByText('Delay Route')).toBeNull();
  expect(screen.queryByText('Cancel Route')).toBeNull();
});
