import { InfoCircleIcon } from './icons/InfoCircleIcon';

interface DisclaimerBoxProps {
  variant?: 'calculator' | 'general';
}

/**
 * DisclaimerBox - Prominent but non-alarming disclaimer component
 *
 * Usage:
 * - calculator: For interactive calculator tools (affordability, rent vs buy)
 * - general: For methodology pages and general informational content
 */
export function DisclaimerBox({ variant = 'general' }: DisclaimerBoxProps) {
  const calculatorText = "This tool is for comparison purposes only. Not intended for mortgage qualification, financial planning, or investment decisions. Consult a financial professional for personal advice.";

  const generalText = "This index is for geographic comparison only. Not intended for mortgage qualification, financial planning, or investment decisions. Consult a financial professional for personal advice.";

  const text = variant === 'calculator' ? calculatorText : generalText;

  return (
    <div className="my-6 rounded-lg bg-amber-50 border-l-4 border-amber-400 p-4" role="note" aria-label="Important disclaimer">
      <div className="flex">
        <div className="flex-shrink-0">
          <InfoCircleIcon className="h-5 w-5 text-amber-400" ariaHidden={true} />
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-700">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
