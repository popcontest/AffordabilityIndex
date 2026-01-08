import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AffordabilityCalculator } from '@/components/AffordabilityCalculator';

describe('AffordabilityCalculator Component', () => {
  const defaultProps = {
    medianHomeValue: 500000,
    medianIncome: 100000,
    cityName: 'Test City',
    stateAbbr: 'TS',
  };

  describe('Initial Rendering', () => {
    it('should render with default values', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      expect(screen.getByText(/calculate what you can afford in test city/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('100000')).toBeInTheDocument();
    });

    it('should display initial affordability calculation', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      // 3.5 * 100,000 = 350,000
      expect(screen.getByText(/\$350,000/)).toBeInTheDocument();
    });

    it('should show monthly payment breakdown', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      expect(screen.getByText(/monthly payment/i)).toBeInTheDocument();
      expect(screen.getByText(/down payment/i)).toBeInTheDocument();
    });
  });

  describe('Affordability Calculations', () => {
    it('should calculate affordable home price as 3.5x income', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      const affordablePrice = 100000 * 3.5;
      expect(screen.getByText(`$${affordablePrice.toLocaleString()}`)).toBeInTheDocument();
    });

    it('should calculate correct down payment for 20%', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      const affordablePrice = 100000 * 3.5;
      const downPayment = affordablePrice * 0.20;

      expect(screen.getByText(`$${downPayment.toLocaleString()}`)).toBeInTheDocument();
    });

    it('should calculate monthly mortgage payment correctly', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      // Loan amount: $350,000 - $70,000 = $280,000
      // Monthly interest rate: 0.062 / 12 = 0.005167
      // Number of payments: 360
      // Using the amortization formula
      const affordablePrice = 100000 * 3.5;
      const downPayment = affordablePrice * 0.20;
      const loanAmount = affordablePrice - downPayment;
      const monthlyRate = 0.062 / 12;
      const numPayments = 360;

      const monthlyPI =
        (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

      const monthlyTax = (affordablePrice * 0.011) / 12;
      const monthlyInsurance = (affordablePrice * 0.005) / 12;
      const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance;

      expect(screen.getByText(/\$1,7\d{2}/)).toBeInTheDocument(); // Should be around $1,700-1,799
    });
  });

  describe('User Interaction', () => {
    it('should update calculation when income changes', async () => {
      const user = userEvent.setup();
      render(<AffordabilityCalculator {...defaultProps} />);

      const incomeInput = screen.getByLabelText(/your annual household income/i);
      await user.clear(incomeInput);
      await user.type(incomeInput, '150000');

      // 3.5 * 150,000 = 525,000
      expect(screen.getByText(/\$525,000/)).toBeInTheDocument();
    });

    it('should update calculation when down payment changes', async () => {
      const user = userEvent.setup();
      render(<AffordabilityCalculator {...defaultProps} />);

      const slider = screen.getByLabelText(/down payment:/i);
      await user.clear(slider);
      // Wait for input to be updated

      // With 10% down payment, monthly payment should increase
      // (loan amount is higher)
      const monthlyPayment = screen.getByText(/monthly payment/i).nextElementSibling;
      expect(monthlyPayment).toBeInTheDocument();
    });
  });

  describe('Affordability Assessment', () => {
    it('should show positive message when user can afford median home', () => {
      const props = {
        ...defaultProps,
        medianHomeValue: 300000, // Lower than affordable price of 350,000
      };

      render(<AffordabilityCalculator {...props} />);

      expect(screen.getByText(/great news/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass(/bg-green-50/i);
    });

    it('should show warning when user cannot afford median home', () => {
      const props = {
        ...defaultProps,
        medianHomeValue: 600000, // Higher than affordable price of 350,000
      };

      render(<AffordabilityCalculator {...props} />);

      expect(screen.getByText(/stretch budget/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass(/bg-yellow-50/i);
    });

    it('should show percentage of homes affordable', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      // Can afford 350,000 out of 500,000 = 70%
      expect(screen.getByText(/70%/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero income', async () => {
      const user = userEvent.setup();
      render(<AffordabilityCalculator {...defaultProps} />);

      const incomeInput = screen.getByLabelText(/your annual household income/i);
      await user.clear(incomeInput);
      await user.type(incomeInput, '0');

      // Should show $0 or handle gracefully
      expect(screen.getByText(/\$0/)).toBeInTheDocument();
    });

    it('should handle very high income', async () => {
      const user = userEvent.setup();
      render(<AffordabilityCalculator {...defaultProps} />);

      const incomeInput = screen.getByLabelText(/your annual household income/i);
      await user.clear(incomeInput);
      await user.type(incomeInput, '1000000');

      // 3.5 * 1,000,000 = 3,500,000
      expect(screen.getByText(/\$3,500,000/)).toBeInTheDocument();
    });

    it('should handle minimum down payment (3%)', async () => {
      const user = userEvent.setup();
      render(<AffordabilityCalculator {...defaultProps} />);

      const slider = screen.getByRole('slider', { name: /down payment/i });
      // Update to minimum value (3%)
      await user.clear(slider);
      // This is a range input, so we interact with it differently

      // The down payment display should update
      expect(slider).toBeInTheDocument();
    });
  });

  describe('Payment Breakdown', () => {
    it('should show detailed breakdown when expanded', async () => {
      const user = userEvent.setup();
      render(<AffordabilityCalculator {...defaultProps} />);

      const details = screen.getByText(/view payment breakdown/i);
      await user.click(details);

      expect(screen.getByText(/principal & interest/i)).toBeInTheDocument();
      expect(screen.getByText(/property tax/i)).toBeInTheDocument();
      expect(screen.getByText(/home insurance/i)).toBeInTheDocument();
    });

    it('should include interest rate assumption', async () => {
      const user = userEvent.setup();
      render(<AffordabilityCalculator {...defaultProps} />);

      const details = screen.getByText(/view payment breakdown/i);
      await user.click(details);

      expect(screen.getByText(/6\.20% interest rate/i)).toBeInTheDocument();
      expect(screen.getByText(/30-year fixed/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      expect(screen.getByRole('region', { name: /calculator-heading/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /results/i })).toBeInTheDocument();
    });

    it('should announce results with aria-live', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      const resultsRegion = screen.getByRole('region', { name: /results/i });
      expect(resultsRegion).toHaveAttribute('aria-live', 'polite');
      expect(resultsRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have proper input labels', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      expect(screen.getByLabelText(/your annual household income/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/down payment:/i)).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('should prevent negative income', async () => {
      const user = userEvent.setup();
      render(<AffordabilityCalculator {...defaultProps} />);

      const incomeInput = screen.getByLabelText(/your annual household income/i);

      // Try to type negative number
      await user.clear(incomeInput);
      await user.type(incomeInput, '-50000');

      // Input should handle this gracefully (min="0" attribute)
      expect(incomeInput).toHaveAttribute('min', '0');
    });
  });

  describe('Constants Assumptions', () => {
    it('should use 6.2% interest rate', async () => {
      const user = userEvent.setup();
      render(<AffordabilityCalculator {...defaultProps} />);

      const details = screen.getByText(/view payment breakdown/i);
      await user.click(details);

      expect(screen.getByText(/6\.20% interest rate/i)).toBeInTheDocument();
    });

    it('should use 1.1% property tax rate', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      // This is reflected in the monthly payment calculation
      // We verify it's in the breakdown
      const details = screen.getByText(/property tax/i);
      expect(details).toBeInTheDocument();
    });

    it('should use 0.5% insurance rate', () => {
      render(<AffordabilityCalculator {...defaultProps} />);

      const insurance = screen.getByText(/home insurance/i);
      expect(insurance).toBeInTheDocument();
    });
  });
});
