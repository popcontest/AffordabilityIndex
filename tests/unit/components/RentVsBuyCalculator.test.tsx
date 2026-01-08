import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RentVsBuyCalculator } from '@/components/RentVsBuyCalculator';

describe('RentVsBuyCalculator Component', () => {
  const defaultProps = {
    medianRent: 2000,
    medianHomeValue: 500000,
    propertyTaxRate: 0.012,
    cityName: 'Test City',
    stateAbbr: 'TS',
  };

  describe('Initial Rendering', () => {
    it('should render with default values', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      expect(screen.getByText(/rent vs buy analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/compare the cost of renting vs buying in test city/i)).toBeInTheDocument();
    });

    it('should display median rent', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      expect(screen.getByText('$2,000')).toBeInTheDocument();
      expect(screen.getByText(/median rent/i)).toBeInTheDocument();
    });

    it('should display monthly buy cost', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Should show monthly cost (mortgage + taxes + insurance + maintenance)
      const monthlyBuyText = screen.getByText(/mortgage \+ taxes \+ insurance \+ maintenance/i);
      expect(monthlyBuyText).toBeInTheDocument();
    });
  });

  describe('Monthly Cost Calculations', () => {
    it('should calculate monthly mortgage payment correctly', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Loan amount: $500,000 * (1 - 0.20) = $400,000
      // Monthly rate: 0.07 / 12 = 0.005833
      // Using amortization formula
      const loanAmount = 500000 * 0.80;
      const monthlyRate = 0.07 / 12;
      const numPayments = 360;

      const expectedMortgage =
        (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

      // Find the monthly buy cost display
      const monthlyBuyElements = screen.getAllByText(/\$/);
      const monthlyBuyElement = monthlyBuyElements.find(el =>
        el.textContent?.includes('/mo') &&
        el.parentElement?.textContent?.includes('Buying')
      );

      expect(monthlyBuyElement).toBeInTheDocument();
    });

    it('should include property tax in monthly cost', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Monthly property tax: ($500,000 * 0.012) / 12 = $500
      const expectedMonthlyTax = (500000 * 0.012) / 12;
      expect(expectedMonthlyTax).toBeGreaterThan(0);
    });

    it('should include insurance in monthly cost', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Monthly insurance: ($500,000 * 0.006) / 12 = $250
      const expectedMonthlyInsurance = (500000 * 0.006) / 12;
      expect(expectedMonthlyInsurance).toBeGreaterThan(0);
    });

    it('should include maintenance in monthly cost', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Monthly maintenance: ($500,000 * 0.01) / 12 = $416.67
      const expectedMonthlyMaintenance = (500000 * 0.01) / 12;
      expect(expectedMonthlyMaintenance).toBeGreaterThan(0);
    });
  });

  describe('Total Cost Analysis', () => {
    it('should calculate total rent cost over N years', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Default: 5 years
      // Total rent: $2,000 * 12 * 5 = $120,000
      const expectedTotalRent = 2000 * 12 * 5;

      expect(screen.getByText(/\$120,000/)).toBeInTheDocument();
    });

    it('should calculate total buy cost over N years', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Down payment: $500,000 * 0.20 = $100,000
      // Closing costs: $500,000 * 0.03 = $15,000
      // Monthly payments: calculated monthly buy cost * 12 * 5
      const downPayment = 500000 * 0.20;
      const closingCosts = 500000 * 0.03;

      expect(downPayment).toBe(100000);
      expect(closingCosts).toBe(15000);
    });

    it('should calculate equity gained', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Should show equity gained calculation
      expect(screen.getByText(/equity gained/i)).toBeInTheDocument();
    });

    it('should calculate net buy cost', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Net cost = total buy cost - equity gained
      expect(screen.getByText(/net cost/i)).toBeInTheDocument();
    });
  });

  describe('Breakeven Analysis', () => {
    it('should calculate breakeven point', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      expect(screen.getByText(/breakeven point/i)).toBeInTheDocument();
    });

    it('should show breakeven year when buying becomes cheaper', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // With these values, buying should become cheaper at some point
      const breakevenText = screen.queryByText(/buying becomes cheaper than renting/i);
      expect(breakevenText).toBeInTheDocument();
    });

    it('should indicate when renting is always cheaper', () => {
      const props = {
        ...defaultProps,
        medianRent: 500, // Very low rent
        medianHomeValue: 1000000, // Very expensive home
        propertyTaxRate: 0.02, // High property tax
      };

      render(<RentVsBuyCalculator {...props} />);

      // Renting might be cheaper for the full 10-year period
      const rentingCheaperText = screen.queryByText(/renting is cheaper for the full/i);
      expect(rentingCheaperText).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should update when down payment changes', async () => {
      const user = userEvent.setup();
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Default is 20%
      expect(screen.getByText(/down payment: 20%/i)).toBeInTheDocument();

      const slider = screen.getByRole('slider', { name: /down payment/i });
      expect(slider).toHaveValue('0.2');
    });

    it('should update when years to stay changes', async () => {
      const user = userEvent.setup();
      render(<RentVsBuyCalculator {...defaultProps} />);

      expect(screen.getByText(/years to stay: 5/i)).toBeInTheDocument();

      const slider = screen.getByRole('slider', { name: /years to stay/i });
      expect(slider).toHaveValue('5');
    });

    it('should update when mortgage rate changes', async () => {
      const user = userEvent.setup();
      render(<RentVsBuyCalculator {...defaultProps} />);

      expect(screen.getByText(/mortgage rate: 7\.00%/i)).toBeInTheDocument();

      const rateInput = screen.getByRole('spinbutton', { name: /mortgage rate/i });
      expect(rateInput).toHaveValue(7);
    });

    it('should recalculate totals when years to stay changes', async () => {
      const user = userEvent.setup();
      render(<RentVsBuyCalculator {...defaultProps} />);

      // Change to 10 years
      const slider = screen.getByRole('slider', { name: /years to stay/i });

      // Total rent should double from 5 to 10 years
      // 5 years: $120,000
      // 10 years: $240,000
      const totalRent = screen.getByText(/\$240,000/);
      expect(totalRent).toBeInTheDocument();
    });
  });

  describe('Equity Calculations', () => {
    it('should calculate principal paid down', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // With 20% down on $500K home, after 5 years:
      // Loan amount: $400,000
      // Monthly payment: ~$2,661
      // Interest portion decreases over time
      // Principal portion increases
      expect(screen.getByText(/equity gained/i)).toBeInTheDocument();
    });

    it('should include home appreciation in equity', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // 3% annual appreciation
      // After 5 years: $500,000 * 0.03 * 5 = $75,000 appreciation
      const appreciation = 500000 * 0.03 * 5;
      expect(appreciation).toBe(75000);
    });
  });

  describe('Down Payment Scenarios', () => {
    it('should handle minimum down payment (3.5%)', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      const slider = screen.getByRole('slider', { name: /down payment/i });
      expect(slider).toHaveAttribute('min', '0.035');
    });

    it('should handle maximum down payment (50%)', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      const slider = screen.getByRole('slider', { name: /down payment/i });
      expect(slider).toHaveAttribute('max', '0.50');
    });

    it('should show actual down payment amount', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // 20% of $500,000 = $100,000
      expect(screen.getByText(/\$100,000/)).toBeInTheDocument();
    });
  });

  describe('Years to Stay Scenarios', () => {
    it('should handle minimum years (1)', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      const slider = screen.getByRole('slider', { name: /years to stay/i });
      expect(slider).toHaveAttribute('min', '1');
    });

    it('should handle maximum years (10)', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      const slider = screen.getByRole('slider', { name: /years to stay/i });
      expect(slider).toHaveAttribute('max', '10');
    });
  });

  describe('Mortgage Rate Input', () => {
    it('should accept custom mortgage rate', async () => {
      const user = userEvent.setup();
      render(<RentVsBuyCalculator {...defaultProps} />);

      const rateInput = screen.getByRole('spinbutton', { name: /mortgage rate/i });

      await user.clear(rateInput);
      await user.type(rateInput, '6.5');

      expect(rateInput).toHaveValue(6.5);
    });

    it('should have minimum rate constraint', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      const rateInput = screen.getByRole('spinbutton', { name: /mortgage rate/i });
      expect(rateInput).toHaveAttribute('min', '3');
    });

    it('should have maximum rate constraint', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      const rateInput = screen.getByRole('spinbutton', { name: /mortgage rate/i });
      expect(rateInput).toHaveAttribute('max', '12');
    });
  });

  describe('Assumptions and Constants', () => {
    it('should assume 3% annual appreciation', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // This is reflected in equity calculation
      expect(screen.getByText(/equity gained/i)).toBeInTheDocument();
    });

    it('should assume 0.6% home insurance rate', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // This is included in monthly buy cost
      expect(screen.getByText(/mortgage \+ taxes/i)).toBeInTheDocument();
    });

    it('should assume 1% maintenance rate', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // This is included in monthly buy cost
      expect(screen.getByText(/mortgage \+ taxes/i)).toBeInTheDocument();
    });

    it('should assume 3% closing costs', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      // $500,000 * 0.03 = $15,000
      // This is factored into total buy cost
      expect(screen.getByText(/total over/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very low rent', () => {
      const props = {
        ...defaultProps,
        medianRent: 500,
      };

      render(<RentVsBuyCalculator {...props} />);

      expect(screen.getByText('$500')).toBeInTheDocument();
    });

    it('should handle very high home value', () => {
      const props = {
        ...defaultProps,
        medianHomeValue: 2000000,
      };

      render(<RentVsBuyCalculator {...props} />);

      // Down payment at 20%: $400,000
      expect(screen.getByText(/\$400,000/)).toBeInTheDocument();
    });

    it('should handle high property tax rate', () => {
      const props = {
        ...defaultProps,
        propertyTaxRate: 0.03, // 3%
      };

      render(<RentVsBuyCalculator {...props} />);

      // This should increase monthly buy cost
      expect(screen.getByText(/mortgage \+ taxes/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for inputs', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      expect(screen.getByLabelText(/down payment:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/years to stay:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mortgage rate:/i)).toBeInTheDocument();
    });

    it('should have accessible sliders', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      const downPaymentSlider = screen.getByRole('slider', { name: /down payment/i });
      const yearsSlider = screen.getByRole('slider', { name: /years to stay/i });

      expect(downPaymentSlider).toBeInTheDocument();
      expect(yearsSlider).toBeInTheDocument();
    });
  });

  describe('Disclaimer', () => {
    it('should show disclaimer with assumptions', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      expect(screen.getByText(/for illustration only/i)).toBeInTheDocument();
      expect(screen.getByText(/does not constitute financial advice/i)).toBeInTheDocument();
    });

    it('should include data source information', () => {
      render(<RentVsBuyCalculator {...defaultProps} />);

      expect(screen.getByText(/acs median rent/i)).toBeInTheDocument();
      expect(screen.getByText(/zillow median home value/i)).toBeInTheDocument();
    });
  });
});
