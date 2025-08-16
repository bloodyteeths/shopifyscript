import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock Remix router
global.mockNavigate = jest.fn();
global.mockLocation = {
  pathname: '/app',
  search: '',
  hash: '',
  state: null,
  key: 'default'
};

jest.mock('@remix-run/react', () => ({
  useNavigate: () => global.mockNavigate,
  useLocation: () => global.mockLocation,
  useLoaderData: () => ({}),
  useActionData: () => ({}),
  useNavigation: () => ({ state: 'idle' }),
  Form: ({ children, ...props }) => 
    React.createElement('form', props, children),
  Link: ({ children, to, ...props }) =>
    React.createElement('a', { ...props, href: to }, children),
  NavLink: ({ children, to, ...props }) =>
    React.createElement('a', { ...props, href: to }, children),
  Outlet: () => React.createElement('div', { 'data-testid': 'outlet' })
}));

// Mock Shopify Polaris components for testing
jest.mock('@shopify/polaris', () => {
  const MockComponent = ({ children, ...props }) => 
    React.createElement('div', { ...props, 'data-mock': true }, children);
  
  return {
    AppProvider: MockComponent,
    Page: MockComponent,
    Card: MockComponent,
    Button: MockComponent,
    TextField: MockComponent,
    Select: MockComponent,
    DataTable: MockComponent,
    Badge: MockComponent,
    Stack: MockComponent,
    Layout: MockComponent,
    Spinner: MockComponent,
    Toast: MockComponent,
    Modal: MockComponent,
    Form: MockComponent,
    FormLayout: MockComponent
  };
});

// Mock Recharts for testing
jest.mock('recharts', () => ({
  LineChart: ({ children, ...props }) => 
    React.createElement('div', { ...props, 'data-testid': 'line-chart' }, children),
  Line: ({ children, ...props }) => 
    React.createElement('div', { ...props, 'data-testid': 'line' }, children),
  XAxis: ({ children, ...props }) => 
    React.createElement('div', { ...props, 'data-testid': 'x-axis' }, children),
  YAxis: ({ children, ...props }) => 
    React.createElement('div', { ...props, 'data-testid': 'y-axis' }, children),
  CartesianGrid: ({ children, ...props }) => 
    React.createElement('div', { ...props, 'data-testid': 'cartesian-grid' }, children),
  Tooltip: ({ children, ...props }) => 
    React.createElement('div', { ...props, 'data-testid': 'tooltip' }, children),
  ResponsiveContainer: ({ children, ...props }) => 
    React.createElement('div', { ...props, 'data-testid': 'responsive-container' }, children)
}));

// Setup global fetch mock
global.fetch = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  global.mockNavigate.mockClear();
});