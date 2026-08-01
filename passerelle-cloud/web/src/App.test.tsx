import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeAll } from 'vitest';
import App from './App';
import i18n from './i18n';

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

describe('App component', () => {
  it('renders Passerelle title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      'Passerelle',
    );
  });

  it('renders Machine ID input when query param is absent', () => {
    render(<App />);
    expect(
      screen.getByLabelText(i18n.t('login.select_pc') as string),
    ).toBeDefined();
  });
});
