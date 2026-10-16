import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check, Compass } from 'lucide-react';

const ONBOARDING_KEY = 'pathwise_onboarding_completed';

export function OnboardingTour({ role = 'student' }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed && role !== 'teacher') {
      setVisible(true);
    }
  }, [role]);

  const steps = [
    {
      title: 'This is your Concept Map',
      description: 'Explore the full prerequisite dependency graph. Concepts are color-coded by your current mastery level so you always know where foundational gaps exist.',
    },
    {
      title: 'This is your Recommended Next Action',
      description: 'Pathwise automatically calculates your highest-priority diagnostic quiz or coding challenge based on your weakest prerequisites and performance history.',
    },
    {
      title: 'Track your Mastery and Progress Here',
      description: 'Inspect your probabilistic concept mastery ring, practice streaks, and detailed question-by-question analytics as you complete activities.',
    },
  ];

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setVisible(false);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  if (!visible) return null;

  const current = steps[step];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 1000,
        maxWidth: '380px',
        background: 'var(--surface)',
        border: '1px solid var(--primary-border)',
        borderRadius: '12px',
        boxShadow: 'var(--dialog-shadow)',
        padding: '16px 18px',
        animation: 'fadeIn 250ms ease',
      }}
      role="region"
      aria-label="Welcome Onboarding Tour"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Compass size={16} color="var(--primary)" />
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.04em' }}>
            Quick Tour &bull; Step {step + 1} of {steps.length}
          </span>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '2px' }}
          aria-label="Close tour"
        >
          <X size={15} />
        </button>
      </div>

      <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
        {current.title}
      </h4>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45', marginBottom: '14px' }}>
        {current.description}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleDismiss}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', fontSize: '12px', cursor: 'pointer', padding: '0' }}
        >
          Skip tour
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={handleNext}
          style={{ padding: '5px 12px', fontSize: '12px' }}
        >
          <span>{step === steps.length - 1 ? 'Get Started' : 'Next'}</span>
          {step === steps.length - 1 ? <Check size={13} /> : <ArrowRight size={13} />}
        </button>
      </div>
    </div>
  );
}

export default OnboardingTour;
