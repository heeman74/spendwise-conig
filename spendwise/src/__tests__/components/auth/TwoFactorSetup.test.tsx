import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { SEND_SETUP_CODE, ENABLE_TWO_FACTOR } from '@/graphql/mutations/twoFactor';

describe('TwoFactorSetup', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Method Selection', () => {
    it('should render method selection screen', () => {
      render(
        <MockedProvider mocks={[]}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      expect(screen.getByText(/Set Up Two-Factor Authentication/i)).toBeInTheDocument();
      expect(screen.getByText(/Email Verification/i)).toBeInTheDocument();
      expect(screen.getByText(/SMS Verification/i)).toBeInTheDocument();
    });

    it('should show skip button when not required', () => {
      render(
        <MockedProvider mocks={[]}>
          <TwoFactorSetup onComplete={mockOnComplete} onSkip={mockOnSkip} required={false} />
        </MockedProvider>
      );

      const skipButton = screen.getByText(/Skip for now/i);
      expect(skipButton).toBeInTheDocument();
    });

    it('should hide skip button when required', () => {
      render(
        <MockedProvider mocks={[]}>
          <TwoFactorSetup onComplete={mockOnComplete} required={true} />
        </MockedProvider>
      );

      expect(screen.queryByText(/Skip for now/i)).not.toBeInTheDocument();
    });

    it('should call onSkip when skip button clicked', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider mocks={[]}>
          <TwoFactorSetup onComplete={mockOnComplete} onSkip={mockOnSkip} required={false} />
        </MockedProvider>
      );

      const skipButton = screen.getByText(/Skip for now/i);
      await user.click(skipButton);

      expect(mockOnSkip).toHaveBeenCalled();
    });
  });

  describe('Email 2FA Setup', () => {
    const mockSendEmailCode = {
      request: {
        query: SEND_SETUP_CODE,
        variables: { type: 'EMAIL' },
      },
      result: {
        data: {
          sendSetupCode: {
            success: true,
            expiresInMinutes: 1,
            codeSentTo: 'user@example.com',
          },
        },
      },
    };

    const mockEnableEmail = {
      request: {
        query: ENABLE_TWO_FACTOR,
        variables: { type: 'EMAIL', code: '123456' },
      },
      result: {
        data: {
          enableTwoFactor: {
            success: true,
            backupCodes: ['CODE1', 'CODE2', 'CODE3'],
            message: 'Email 2FA enabled',
          },
        },
      },
    };

    it('should send code when email method selected', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider mocks={[mockSendEmailCode]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      await waitFor(() => {
        expect(screen.getByText(/Code sent to/i)).toBeInTheDocument();
      });
    });

    it('should show verification code input after sending code', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider mocks={[mockSendEmailCode]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });
    });

    it('should enable email 2FA with valid code', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider mocks={[mockSendEmailCode, mockEnableEmail]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      // Select email
      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      // Wait for code input
      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });

      // Enter code
      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '123456');

      // Submit
      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      // Should show backup codes
      await waitFor(() => {
        expect(screen.getByText(/Two-Factor Authentication Enabled!/i)).toBeInTheDocument();
        expect(screen.getByText('CODE1')).toBeInTheDocument();
      });
    });

    it('should only accept 6-digit codes', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider mocks={[mockSendEmailCode]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/Verification Code/i) as HTMLInputElement;
      await user.type(codeInput, '12345678');

      // Should truncate to 6 digits
      expect(codeInput.value).toBe('123456');
    });

    it('should show resend code option', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider mocks={[mockSendEmailCode]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      await waitFor(() => {
        expect(screen.getByText(/Resend code/i)).toBeInTheDocument();
      });
    });
  });

  describe('SMS 2FA Setup', () => {
    it('should show phone number input for SMS', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider mocks={[]}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const smsButton = screen.getByText(/SMS Verification/i).closest('button');
      await user.click(smsButton!);

      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    });

    it('should validate phone number format', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider mocks={[]}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const smsButton = screen.getByText(/SMS Verification/i).closest('button');
      await user.click(smsButton!);

      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, 'invalid');

      const sendButton = screen.getByRole('button', { name: /Send Code/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/valid phone number/i)).toBeInTheDocument();
      });
    });

    it('should send SMS code with valid phone number', async () => {
      const user = userEvent.setup();

      const mockSendSMS = {
        request: {
          query: SEND_SETUP_CODE,
          variables: { type: 'SMS', phoneNumber: '+1234567890' },
        },
        result: {
          data: {
            sendSetupCode: {
              success: true,
              expiresInMinutes: 1,
              codeSentTo: '+***7890',
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[mockSendSMS]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const smsButton = screen.getByText(/SMS Verification/i).closest('button');
      await user.click(smsButton!);

      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.type(phoneInput, '+1234567890');

      const sendButton = screen.getByRole('button', { name: /Send Code/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });
    });
  });

  describe('Backup Codes', () => {
    const mockEnableWithBackupCodes = {
      request: {
        query: ENABLE_TWO_FACTOR,
        variables: { type: 'EMAIL', code: '123456' },
      },
      result: {
        data: {
          enableTwoFactor: {
            success: true,
            backupCodes: ['CODE1', 'CODE2', 'CODE3', 'CODE4', 'CODE5'],
            message: null,
          },
        },
      },
    };

    it('should display backup codes after successful setup', async () => {
      const user = userEvent.setup();

      const mockSendCode = {
        request: {
          query: SEND_SETUP_CODE,
          variables: { type: 'EMAIL' },
        },
        result: {
          data: {
            sendSetupCode: {
              success: true,
              expiresInMinutes: 1,
              codeSentTo: 'user@example.com',
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[mockSendCode, mockEnableWithBackupCodes]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('CODE1')).toBeInTheDocument();
        expect(screen.getByText('CODE5')).toBeInTheDocument();
      });
    });

    it('should allow copying backup codes', async () => {
      const user = userEvent.setup();
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(),
        },
      });

      const mockSendCode = {
        request: {
          query: SEND_SETUP_CODE,
          variables: { type: 'EMAIL' },
        },
        result: {
          data: {
            sendSetupCode: {
              success: true,
              expiresInMinutes: 1,
              codeSentTo: 'user@example.com',
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[mockSendCode, mockEnableWithBackupCodes]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('CODE1')).toBeInTheDocument();
      });

      const copyButton = screen.getByRole('button', { name: /Copy/i });
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('should call onComplete when continuing from backup codes', async () => {
      const user = userEvent.setup();

      const mockSendCode = {
        request: {
          query: SEND_SETUP_CODE,
          variables: { type: 'EMAIL' },
        },
        result: {
          data: {
            sendSetupCode: {
              success: true,
              expiresInMinutes: 1,
              codeSentTo: 'user@example.com',
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[mockSendCode, mockEnableWithBackupCodes]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '123456');

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('CODE1')).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /Continue to Dashboard/i });
      await user.click(continueButton);

      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should allow going back to method selection from phone input', async () => {
      const user = userEvent.setup();

      render(
        <MockedProvider mocks={[]}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const smsButton = screen.getByText(/SMS Verification/i).closest('button');
      await user.click(smsButton!);

      const backButton = screen.getByRole('button', { name: /Back/i });
      await user.click(backButton);

      expect(screen.getByText(/Choose how you want to receive/i)).toBeInTheDocument();
    });

    it('should allow going back from verification code screen', async () => {
      const user = userEvent.setup();

      const mockSendCode = {
        request: {
          query: SEND_SETUP_CODE,
          variables: { type: 'EMAIL' },
        },
        result: {
          data: {
            sendSetupCode: {
              success: true,
              expiresInMinutes: 1,
              codeSentTo: 'user@example.com',
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[mockSendCode]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /Back/i });
      await user.click(backButton);

      expect(screen.getByText(/Choose how you want to receive/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error when code sending fails', async () => {
      const user = userEvent.setup();

      const mockError = {
        request: {
          query: SEND_SETUP_CODE,
          variables: { type: 'EMAIL' },
        },
        error: new Error('Failed to send code'),
      };

      render(
        <MockedProvider mocks={[mockError]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      await waitFor(() => {
        expect(screen.getByText(/Failed to send/i)).toBeInTheDocument();
      });
    });

    it('should display error for invalid verification code', async () => {
      const user = userEvent.setup();

      const mockSendCode = {
        request: {
          query: SEND_SETUP_CODE,
          variables: { type: 'EMAIL' },
        },
        result: {
          data: {
            sendSetupCode: {
              success: true,
              expiresInMinutes: 1,
              codeSentTo: 'user@example.com',
            },
          },
        },
      };

      const mockInvalidCode = {
        request: {
          query: ENABLE_TWO_FACTOR,
          variables: { type: 'EMAIL', code: '999999' },
        },
        result: {
          data: {
            enableTwoFactor: {
              success: false,
              backupCodes: null,
              message: 'Invalid verification code',
            },
          },
        },
      };

      render(
        <MockedProvider mocks={[mockSendCode, mockInvalidCode]} addTypename={false}>
          <TwoFactorSetup onComplete={mockOnComplete} />
        </MockedProvider>
      );

      const emailButton = screen.getByText(/Email Verification/i).closest('button');
      await user.click(emailButton!);

      await waitFor(() => {
        expect(screen.getByLabelText(/Verification Code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/Verification Code/i);
      await user.type(codeInput, '999999');

      const verifyButton = screen.getByRole('button', { name: /Verify/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid verification code/i)).toBeInTheDocument();
      });
    });
  });
});
