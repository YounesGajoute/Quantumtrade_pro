# Contributing to QuantumTrade Pro

Thank you for your interest in contributing to QuantumTrade Pro! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Release Process](#release-process)

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `develop`
4. **Make your changes**
5. **Test thoroughly**
6. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Docker (optional, for containerized development)
- Redis (for testing and development)

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/quantumtrade_pro.git
cd quantumtrade_pro

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
pnpm dev
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Binance API
NEXT_PUBLIC_BINANCE_API_URL=https://api.binance.com
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key

# Telegram Bot
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=your_bot_token

# Database (if using)
DATABASE_URL=your_database_url

# Redis (for caching and events)
REDIS_URL=redis://localhost:6379
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Follow strict TypeScript configuration
- Use proper type annotations
- Avoid `any` type when possible

### React/Next.js

- Use functional components with hooks
- Follow Next.js 13+ App Router conventions
- Use proper error boundaries
- Implement proper loading states

### File Structure

```
lib/
├── core/           # Core trading logic
├── api/           # API utilities
├── utils/         # Utility functions
components/
├── ui/            # Reusable UI components
├── trading/       # Trading-specific components
app/
├── api/           # API routes
├── (pages)/       # Application pages
```

### Naming Conventions

- **Files**: kebab-case (`trading-dashboard.tsx`)
- **Components**: PascalCase (`TradingDashboard`)
- **Functions**: camelCase (`calculateRSI`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Types/Interfaces**: PascalCase (`TradingSignal`)

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test --coverage

# Run specific test file
pnpm test -- tests/risk-manager.test.ts
```

### Writing Tests

- Write tests for all new features
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test error scenarios

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('Feature', () => {
    it('should do something when condition is met', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = function(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Pull Request Process

### Before Submitting

1. **Ensure tests pass**: `pnpm test`
2. **Run linting**: `pnpm lint`
3. **Type check**: `pnpm tsc --noEmit`
4. **Build successfully**: `pnpm build`
5. **Update documentation** if needed

### PR Guidelines

- **Title**: Clear, descriptive title
- **Description**: Detailed description of changes
- **Related Issues**: Link to related issues
- **Screenshots**: Include screenshots for UI changes
- **Testing**: Describe how you tested the changes

### PR Template

Use the provided PR template and fill out all sections:

- [ ] Type of change selected
- [ ] Related issues linked
- [ ] Changes described
- [ ] Testing completed
- [ ] Checklist items checked

## Issue Guidelines

### Bug Reports

- Use the bug report template
- Provide clear reproduction steps
- Include environment details
- Add screenshots if applicable

### Feature Requests

- Use the feature request template
- Describe the problem being solved
- Provide use cases
- Consider implementation complexity

### Security Issues

- Use the security vulnerability template
- **Do not** publicly disclose vulnerabilities
- Provide detailed impact assessment

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Release Steps

1. **Create release branch** from `develop`
2. **Update version** in `package.json`
3. **Update changelog**
4. **Create pull request** to `main`
5. **Merge and tag** release
6. **Deploy** to production

### Changelog

Keep a detailed changelog in `CHANGELOG.md`:

```markdown
## [1.2.0] - 2024-01-15

### Added
- New trading strategy implementation
- Enhanced risk management features

### Changed
- Improved API response times
- Updated UI components

### Fixed
- Bug in order execution logic
- Memory leak in data processing
```

## Getting Help

- **Documentation**: Check the README and docs folder
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report security issues privately

## Recognition

Contributors will be recognized in:
- Repository contributors list
- Release notes
- Project documentation

Thank you for contributing to QuantumTrade Pro! 🚀 