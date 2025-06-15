import { render } from '@testing-library/react';
import App from '../src/App';
test('renders App without crashing', () => {
  render(<App />);
});
