'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

/**
 * Accordion component for FAQ items
 */
export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="border border-gray-200 rounded-lg">
          <button
            onClick={() => toggleItem(index)}
            aria-expanded={openIndex === index}
            aria-controls={`faq-answer-${index}`}
            className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <span className="text-sm font-medium text-gray-900">{item.question}</span>
            <span className="text-gray-500 text-lg" aria-hidden="true">{openIndex === index ? '−' : '+'}</span>
          </button>
          {openIndex === index && (
            <div id={`faq-answer-${index}`} className="px-4 pb-3 pt-1 text-sm text-gray-700 leading-relaxed border-t border-gray-100">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
