import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CredentialList } from '../../components/CredentialList.jsx';

const makeCred = (overrides = {}) => ({
  id: 'abcdef1234567890xyz',
  deviceType: 'platform',
  backedUp: false,
  transports: ['internal'],
  createdAt: '2024-06-15T10:00:00Z',
  ...overrides,
});

describe('CredentialList', () => {
  // With no passkeys registered, the user should see a friendly empty state message
  it('renders empty state when credentials array is empty', () => {
    render(<CredentialList credentials={[]} onDelete={jest.fn()} />);
    expect(screen.getByText('No passkeys registered yet.')).toBeInTheDocument();
  });

  // Only the first 16 characters of the credential id should be shown to keep the UI tidy
  it('renders credential id (first 16 chars) for each credential', () => {
    const cred = makeCred();
    render(<CredentialList credentials={[cred]} onDelete={jest.fn()} />);
    expect(screen.getByText('abcdef1234567890…')).toBeInTheDocument();
  });

  // The device type (e.g. "platform") should be visible so the user knows what kind of key it is
  it('renders device type', () => {
    render(<CredentialList credentials={[makeCred()]} onDelete={jest.fn()} />);
    expect(screen.getByText('platform')).toBeInTheDocument();
  });

  // Cloud-backed passkeys get a "synced" badge so the user knows they're recoverable
  it('shows "synced" badge when backedUp is true', () => {
    render(<CredentialList credentials={[makeCred({ backedUp: true })]} onDelete={jest.fn()} />);
    expect(screen.getByText('synced')).toBeInTheDocument();
  });

  // Non-backed-up passkeys should not show the "synced" badge
  it('does not show "synced" badge when backedUp is false', () => {
    render(<CredentialList credentials={[makeCred({ backedUp: false })]} onDelete={jest.fn()} />);
    expect(screen.queryByText('synced')).not.toBeInTheDocument();
  });

  // When there's only one passkey, the delete button should be hidden to prevent lockout
  it('does not show delete button when there is only 1 credential', () => {
    render(<CredentialList credentials={[makeCred()]} onDelete={jest.fn()} />);
    expect(screen.queryByTitle('Remove passkey')).not.toBeInTheDocument();
  });

  // With two or more passkeys, each one should have its own delete button
  it('shows delete button when there are 2+ credentials', () => {
    const creds = [makeCred({ id: 'aaa1111111111111111' }), makeCred({ id: 'bbb2222222222222222' })];
    render(<CredentialList credentials={creds} onDelete={jest.fn()} />);
    const buttons = screen.getAllByTitle('Remove passkey');
    expect(buttons).toHaveLength(2);
  });

  // Clicking delete should call onDelete with exactly that credential's id
  it('calls onDelete with the credential id when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    const creds = [makeCred({ id: 'aaa1111111111111111' }), makeCred({ id: 'bbb2222222222222222' })];
    render(<CredentialList credentials={creds} onDelete={onDelete} />);
    const buttons = screen.getAllByTitle('Remove passkey');
    await user.click(buttons[0]);
    expect(onDelete).toHaveBeenCalledWith('aaa1111111111111111');
  });

  // Known transports like USB and NFC should render as labelled icons
  it('renders known transport icons', () => {
    const cred = makeCred({ transports: ['usb', 'nfc'] });
    render(<CredentialList credentials={[cred]} onDelete={jest.fn()} />);
    expect(screen.getByTitle('USB')).toBeInTheDocument();
    expect(screen.getByTitle('NFC')).toBeInTheDocument();
  });

  // An unrecognised transport string should be shown as-is rather than crashing
  it('renders unknown transport as raw value', () => {
    const cred = makeCred({ transports: ['custom-transport'] });
    render(<CredentialList credentials={[cred]} onDelete={jest.fn()} />);
    expect(screen.getByText('custom-transport')).toBeInTheDocument();
  });
});
