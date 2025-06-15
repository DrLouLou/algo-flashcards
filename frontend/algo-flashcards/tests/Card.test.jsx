// Example test file for Card component
import { render } from '@testing-library/react';
import Card from '../src/Card';

test('renders Card component', () => {
  render(<Card card={{ problem: 'Test', difficulty: 'Easy' }} />);
});
