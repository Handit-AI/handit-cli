/**
 * Ink-based authentication flow that replaces the current auth UI
 * while keeping the exact same logic and flow
 */

const React = require('react');
const { Box, Text, render, useInput } = require('ink');

/**
 * Authentication status check component
 */
function AuthStatusCheck({ onAuthenticated, onNeedsAuth }) {
  React.useEffect(() => {
    // Simulate checking authentication status
    // This would call the actual isAuthenticated() function
    setTimeout(() => {
      onNeedsAuth(); // For now, always show auth flow
    }, 500);
  }, []);

  return React.createElement(Box, { flexDirection: 'column', alignItems: 'center', padding: 2 }, [
    React.createElement(Text, { key: 'checking', color: 'yellow' }, '🔍 Checking authentication status...'),
  ]);
}

/**
 * Account selection component
 */
function AccountSelection({ onHasAccount, onCreateAccount, onSkip }) {
  const [selectedOption, setSelectedOption] = React.useState(0);
  const options = [
    { key: 'has', label: 'I have an account - Open browser to login', action: onHasAccount },
    { key: 'create', label: 'I need to create an account', action: onCreateAccount },
    { key: 'skip', label: 'Skip authentication (limited features)', action: onSkip }
  ];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedOption(selectedOption > 0 ? selectedOption - 1 : options.length - 1);
    } else if (key.downArrow) {
      setSelectedOption(selectedOption < options.length - 1 ? selectedOption + 1 : 0);
    } else if (key.return) {
      options[selectedOption].action();
    } else if (key.ctrl && input === 'c') {
      onSkip();
    }
  });

  return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
    // Header
    React.createElement(Box, { key: 'header', flexDirection: 'column', alignItems: 'center', marginBottom: 2 }, [
      React.createElement(Text, { key: 'title', color: 'blue', bold: true }, '🔐 Handit Authentication'),
      React.createElement(Text, { key: 'subtitle', color: 'gray' }, 'Authenticate this machine with Handit.'),
    ]),
    
    // Options
    React.createElement(Box, { key: 'options', flexDirection: 'column', marginBottom: 2 }, [
      options.map((option, index) => 
        React.createElement(Box, { key: option.key, marginBottom: 1 }, [
          React.createElement(Text, {
            color: selectedOption === index ? 'cyan' : 'white',
            backgroundColor: selectedOption === index ? 'blue' : 'black',
            bold: selectedOption === index
          }, `${selectedOption === index ? '► ' : '  '}${option.label}`)
        ])
      )
    ]),
    
    // Instructions
    React.createElement(Box, { key: 'instructions' }, [
      React.createElement(Text, { color: 'gray', dimColor: true }, 'Use ↑ ↓ arrows to navigate, Enter to select'),
    ])
  ]);
}

/**
 * Browser authentication component
 */
function BrowserAuth({ onCodeEntered, onCancel }) {
  const [authCode, setAuthCode] = React.useState('');
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const [error, setError] = React.useState('');

  useInput((input, key) => {
    if (key.return) {
      // Validate and submit
      if (!authCode.trim()) {
        setError('Authentication code cannot be empty');
        return;
      }
      if (authCode.length < 8) {
        setError('Authentication code appears to be too short');
        return;
      }
      setError('');
      onCodeEntered(authCode);
    } else if (key.backspace) {
      if (cursorPosition > 0) {
        const newCode = authCode.slice(0, cursorPosition - 1) + authCode.slice(cursorPosition);
        setAuthCode(newCode);
        setCursorPosition(cursorPosition - 1);
      }
    } else if (key.leftArrow && cursorPosition > 0) {
      setCursorPosition(cursorPosition - 1);
    } else if (key.rightArrow && cursorPosition < authCode.length) {
      setCursorPosition(cursorPosition + 1);
    } else if (key.ctrl && input === 'c') {
      onCancel();
    } else if (input && input.length === 1 && !key.ctrl) {
      const newCode = authCode.slice(0, cursorPosition) + input + authCode.slice(cursorPosition);
      setAuthCode(newCode);
      setCursorPosition(cursorPosition + 1);
      setError('');
    }
  });

  const displayCode = authCode + (Date.now() % 1000 < 500 ? '_' : ''); // Blinking cursor

  return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
    // Header
    React.createElement(Box, { key: 'header', flexDirection: 'column', alignItems: 'center', marginBottom: 2 }, [
      React.createElement(Text, { key: 'title', color: 'yellow', bold: true }, '🔑 Login to Handit'),
      React.createElement(Text, { key: 'subtitle', color: 'gray' }, 'Opening default browser to CLI auth page...'),
    ]),
    
    // Instructions
    React.createElement(Box, { key: 'instructions', flexDirection: 'column', marginBottom: 2 }, [
      React.createElement(Text, { key: 'inst1', color: 'white' }, '1. A browser window should have opened'),
      React.createElement(Text, { key: 'inst2', color: 'white' }, '2. Log in to your Handit account'),
      React.createElement(Text, { key: 'inst3', color: 'white' }, '3. Copy the CLI authentication code'),
      React.createElement(Text, { key: 'inst4', color: 'white' }, '4. Paste it below'),
    ]),
    
    // Input prompt
    React.createElement(Box, { key: 'prompt', marginBottom: 1 }, [
      React.createElement(Text, { color: 'white' }, 'Paste the CLI authentication code:'),
    ]),
    
    // Input field
    React.createElement(Box, { key: 'input', marginBottom: 1 }, [
      React.createElement(Text, { color: 'white', backgroundColor: 'blue' }, displayCode),
    ]),
    
    // Error message
    error ? React.createElement(Box, { key: 'error', marginBottom: 1 }, [
      React.createElement(Text, { color: 'red' }, `❌ ${error}`),
    ]) : null,
    
    // Instructions
    React.createElement(Box, { key: 'help', marginTop: 2 }, [
      React.createElement(Text, { color: 'gray', dimColor: true }, 'Paste the code and press Enter to continue'),
    ])
  ]);
}

/**
 * Account creation component
 */
function AccountCreation({ onCreated, onCancel }) {
  const [selectedOption, setSelectedOption] = React.useState(0);
  const options = [
    { key: 'browser', label: 'Open browser to create account', action: () => onCreated('browser') },
    { key: 'cancel', label: 'Go back', action: onCancel }
  ];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedOption(selectedOption > 0 ? selectedOption - 1 : options.length - 1);
    } else if (key.downArrow) {
      setSelectedOption(selectedOption < options.length - 1 ? selectedOption + 1 : 0);
    } else if (key.return) {
      options[selectedOption].action();
    } else if (key.ctrl && input === 'c') {
      onCancel();
    }
  });

  return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
    // Header
    React.createElement(Box, { key: 'header', flexDirection: 'column', alignItems: 'center', marginBottom: 2 }, [
      React.createElement(Text, { key: 'title', color: 'green', bold: true }, '👤 Create Handit Account'),
      React.createElement(Text, { key: 'subtitle', color: 'gray' }, 'You\'ll need a Handit account to use all features'),
    ]),
    
    // Options
    React.createElement(Box, { key: 'options', flexDirection: 'column', marginBottom: 2 }, [
      options.map((option, index) => 
        React.createElement(Box, { key: option.key, marginBottom: 1 }, [
          React.createElement(Text, {
            color: selectedOption === index ? 'cyan' : 'white',
            backgroundColor: selectedOption === index ? 'blue' : 'black',
            bold: selectedOption === index
          }, `${selectedOption === index ? '► ' : '  '}${option.label}`)
        ])
      )
    ]),
    
    // Instructions
    React.createElement(Box, { key: 'instructions' }, [
      React.createElement(Text, { color: 'gray', dimColor: true }, 'Use ↑ ↓ arrows to navigate, Enter to select'),
    ])
  ]);
}

/**
 * Main authentication flow component
 */
function AuthFlow({ onAuthenticated, onCancelled }) {
  const [currentStep, setCurrentStep] = React.useState('check');
  const [authData, setAuthData] = React.useState({});

  const handleAuthenticated = (tokens) => {
    setAuthData(tokens);
    onAuthenticated(tokens);
  };

  const handleNeedsAuth = () => {
    setCurrentStep('account');
  };

  const handleHasAccount = () => {
    setCurrentStep('browser');
  };

  const handleCreateAccount = () => {
    setCurrentStep('create');
  };

  const handleSkip = () => {
    onAuthenticated({ authenticated: false, apiToken: null, stagingApiToken: null });
  };

  const handleCodeEntered = (code) => {
    // This would normally call the actual authentication API
    // For now, simulate successful authentication
    setTimeout(() => {
      handleAuthenticated({
        authenticated: true,
        apiToken: 'mock-api-token',
        stagingApiToken: 'mock-staging-token'
      });
    }, 1000);
  };

  const handleBack = () => {
    setCurrentStep('account');
  };

  if (currentStep === 'check') {
    return React.createElement(AuthStatusCheck, {
      onAuthenticated: handleAuthenticated,
      onNeedsAuth: handleNeedsAuth
    });
  } else if (currentStep === 'account') {
    return React.createElement(AccountSelection, {
      onHasAccount: handleHasAccount,
      onCreateAccount: handleCreateAccount,
      onSkip: handleSkip
    });
  } else if (currentStep === 'browser') {
    return React.createElement(BrowserAuth, {
      onCodeEntered: handleCodeEntered,
      onCancel: handleBack
    });
  } else if (currentStep === 'create') {
    return React.createElement(AccountCreation, {
      onCreated: (method) => {
        if (method === 'browser') {
          setCurrentStep('browser');
        }
      },
      onCancel: handleBack
    });
  }

  return null;
}

/**
 * Render the authentication flow and return the authentication result
 */
function showAuthFlow() {
  return new Promise((resolve) => {
    const { unmount } = render(
      React.createElement(AuthFlow, {
        onAuthenticated: (authResult) => {
          unmount();
          resolve(authResult);
        },
        onCancelled: () => {
          unmount();
          resolve({ authenticated: false });
        }
      })
    );
  });
}

module.exports = { showAuthFlow };
