import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '../../components/StatusIndicator.jsx';

describe('StatusIndicator', () => {
  // The idle state is the default starting point — should show "Ready"
  it('renders "Ready" label for idle step', () => {
    render(<StatusIndicator step="idle" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  // The requesting state is async so it should show a spinner instead of a static icon
  it('renders spinner for requesting step', () => {
    const { container } = render(<StatusIndicator step="requesting" />);
    expect(container.querySelector('.spinner')).toBeInTheDocument();
    expect(screen.getByText('Requesting options…')).toBeInTheDocument();
  });

  // The authenticating state is waiting on the user's biometric device
  it('renders biometric label for authenticating step', () => {
    render(<StatusIndicator step="authenticating" />);
    expect(screen.getByText('Waiting for biometric…')).toBeInTheDocument();
  });

  // The verifying state is also async — should show a spinner
  it('renders spinner for verifying step', () => {
    const { container } = render(<StatusIndicator step="verifying" />);
    expect(container.querySelector('.spinner')).toBeInTheDocument();
    expect(screen.getByText('Verifying with server…')).toBeInTheDocument();
  });

  // After everything succeeds the indicator should celebrate with "Success!"
  it('renders "Success!" label for success step', () => {
    render(<StatusIndicator step="success" />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  // Something went wrong — should show "Failed" so the user knows to retry
  it('renders "Failed" label for error step', () => {
    render(<StatusIndicator step="error" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  // Any unknown step value should fall back gracefully to the idle state
  it('falls back to idle config for an unknown step', () => {
    render(<StatusIndicator step="unknown-step" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  // Non-spinning steps should render the icon element, not the spinner
  it('renders icon span (not spinner) for non-spinning steps', () => {
    const { container } = render(<StatusIndicator step="idle" />);
    expect(container.querySelector('.spinner')).not.toBeInTheDocument();
  });
});
