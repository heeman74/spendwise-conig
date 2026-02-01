import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { TwoFactorVerify } from '@/components/auth/TwoFactorVerify';
import { LOGIN_STEP_2 } from '@/graphql/mutations/twoFactor';

describe('TwoFactorVerify', () => {
  const mockOnVerify = jest.fn();
  const mockOnCancel = jest.fn();
  const pendingToken = 'test-pending-token';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render verification screen', () => {
      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      expect(screen.getByText(/Two-Factor Authentication/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
    });

    it('should show cancel button when provided', () => {
      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
            onCancel={mockOnCancel}
          />
        </MockedProvider>
      );

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should not show cancel button when not provided', () => {
      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    });

    it('should show expiration notice', () => {
      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      expect(screen.getByText(/expires in 1 minute/i)).toBeInTheDocument();
    });
  });

  describe('Single Method', () => {
    it('should not show method selector for single method', () => {
      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      expect(screen.queryByText(/Verification Method/i)).not.toBeInTheDocument();
    });

    it('should verify email code', async () => {
      const user = userEvent.setup();

      const mockVerify = {
        request: {
          query: LOGIN_STEP_2,
          variables: {
            pendingToken,
            code: '123456',
            type: 'EMAIL',
          },
        },
        result: {
          data: {
            loginStep2: {
              token: 'full-access-token',
              user: {
                id: '1',
                email: 'user@example.com',
                name: 'Test User',
                image: null,
              },
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[mockVerify]} addTypename={false}>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockOnVerify).toHaveBeenCalledWith(
          'full-access-token',
          expect.objectContaining({ id: '1' })
        );
      });
    });
  });

  describe('Multiple Methods', () => {
    it('should show method selector for multiple methods', () => {
      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL', 'SMS']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      expect(screen.getByText(/Verification Method/i)).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
    });

    it('should allow switching between methods', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL', 'SMS']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const smsButton = screen.getByRole('button', { name: /SMS/i });
      await user.click(smsButton);

      // SMS button should now be selected
      expect(smsButton).toHaveClass(/border-blue-500/);
    });

    it('should verify with selected method', async () => {
      const user = userEvent.setup();

      const mockVerifySMS = {
        request: {
          query: LOGIN_STEP_2,
          variables: {
            pendingToken,
            code: '123456',
            type: 'SMS',
          },
        },
        result: {
          data: {
            loginStep2: {
              token: 'full-access-token',
              user: {
                id: '1',
                email: 'user@example.com',
                name: 'Test User',
                image: null,
              },
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[mockVerifySMS]} addTypename={false}>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL', 'SMS']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      // Switch to SMS
      const smsButton = screen.getByRole('button', { name: /SMS/i });
      await user.click(smsButton);

      // Enter code
      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '123456');

      // Verify
      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockOnVerify).toHaveBeenCalled();
      });
    });
  });

  describe('Backup Code', () => {
    it('should show backup code option', () => {
      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      expect(screen.getByText(/Use backup code/i)).toBeInTheDocument();
    });

    it('should switch to backup code mode', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const backupCodeLink = screen.getByText(/Use backup code/i);
      await user.click(backupCodeLink);

      expect(screen.getByText(/Enter one of your backup codes/i)).toBeInTheDocument();
      expect(screen.getByText(/Use verification code instead/i)).toBeInTheDocument();
    });

    it('should verify backup code', async () => {
      const user = userEvent.setup();

      const mockVerifyBackup = {
        request: {
          query: LOGIN_STEP_2,
          variables: {
            pendingToken,
            code: 'BACKUP01',
            type: 'BACKUP_CODE',
          },
        },
        result: {
          data: {
            loginStep2: {
              token: 'full-access-token',
              user: {
                id: '1',
                email: 'user@example.com',
                name: 'Test User',
                image: null,
              },
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[mockVerifyBackup]} addTypename={false}>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      // Switch to backup code
      const backupCodeLink = screen.getByText(/Use backup code/i);
      await user.click(backupCodeLink);

      // Enter backup code
      const codeInput = screen.getByLabelText(/Backup Code/i);
      await user.type(codeInput, 'BACKUP01');

      // Verify
      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockOnVerify).toHaveBeenCalled();
      });
    });

    it('should convert backup code to uppercase', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const backupCodeLink = screen.getByText(/Use backup code/i);
      await user.click(backupCodeLink);

      const codeInput = screen.getByLabelText(/Backup Code/i) as HTMLInputElement;
      await user.type(codeInput, 'backup01');

      expect(codeInput.value).toBe('BACKUP01');
    });

    it('should switch back to verification code mode', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      // Switch to backup code
      await user.click(screen.getByText(/Use backup code/i));

      // Switch back
      await user.click(screen.getByText(/Use verification code instead/i));

      expect(screen.getByText(/Enter the verification code/i)).toBeInTheDocument();
    });
  });

  describe('Code Validation', () => {
    it('should only accept 6-digit codes', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const codeInput = screen.getByLabelText(/Verification Code/i) as HTMLInputElement;
      await user.type(codeInput, '12345678');

      expect(codeInput.value).toBe('123456');
    });

    it('should only accept numeric characters', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const codeInput = screen.getByLabelText(/Verification Code/i) as HTMLInputElement;
      await user.type(codeInput, 'abc123xyz');

      expect(codeInput.value).toBe('123');
    });

    it('should disable verify button for incomplete code', () => {
      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      expect(verifyButton).toBeDisabled();
    });

    it('should enable verify button for complete code', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      expect(verifyButton).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error for invalid code', async () => {
      const user = userEvent.setup();

      const mockError = {
        request: {
          query: LOGIN_STEP_2,
          variables: {
            pendingToken,
            code: '999999',
            type: 'EMAIL',
          },
        },
        error: new Error('Invalid verification code'),
      };

      render(
        <MockedProvider mocks={[mockError]} addTypename={false}>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '999999');

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid or expired verification code/i)).toBeInTheDocument();
      });
    });

    it('should display error for expired code', async () => {
      const user = userEvent.setup();

      const mockError = {
        request: {
          query: LOGIN_STEP_2,
          variables: {
            pendingToken,
            code: '123456',
            type: 'EMAIL',
          },
        },
        error: new Error('Code has expired'),
      };

      render(
        <MockedProvider mocks={[mockError]} addTypename={false}>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/expired/i)).toBeInTheDocument();
      });
    });

    it('should display error for too many attempts', async () => {
      const user = userEvent.setup();

      const mockError = {
        request: {
          query: LOGIN_STEP_2,
          variables: {
            pendingToken,
            code: '123456',
            type: 'EMAIL',
          },
        },
        error: new Error('Too many failed attempts'),
      };

      render(
        <MockedProvider mocks={[mockError]} addTypename={false}>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/Too many failed attempts/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
            onCancel={mockOnCancel}
          />
        </MockedProvider>
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should disable inputs while verifying', async () => {
      const user = userEvent.setup();

      const mockVerify = {
        request: {
          query: LOGIN_STEP_2,
          variables: {
            pendingToken,
            code: '123456',
            type: 'EMAIL',
          },
        },
        result: {
          data: {
            loginStep2: {
              token: 'full-access-token',
              user: {
                id: '1',
                email: 'user@example.com',
                name: 'Test User',
                image: null,
              },
            },
          },
        },
        delay: 1000, // Simulate slow network
      };

      render(
        <MockedProvider mocks={[mockVerify]} addTypename={false}>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      // Input should be disabled during verification
      expect(codeInput).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should auto-focus code input', () => {
      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      const codeInput = screen.getByLabelText(/Verification Code/i);
      expect(codeInput).toHaveFocus();
    });

    it('should have proper ARIA labels', () => {
      render(
        <MockedProvider>
          <TwoFactorVerify
            pendingToken={pendingToken}
            availableMethods={['EMAIL']}
            onVerify={mockOnVerify}
          />
        </MockedProvider>
      );

      expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Verify/i })).toBeInTheDocument();
    });
  });
});
