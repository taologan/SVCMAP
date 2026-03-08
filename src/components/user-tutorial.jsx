import { useEffect, useMemo, useState } from "react";

const CARD_WIDTH = 340;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function UserTutorial({ isOpen, steps, onClose }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const step = steps[stepIndex];
    if (!step?.selector) {
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      const target = document.querySelector(step.selector);
      if (!target) {
        setTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [isOpen, stepIndex, steps]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex >= steps.length - 1;

  const cardStyle = useMemo(() => {
    if (!targetRect) return null;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - targetRect.top - targetRect.height;
    const placeBelow = spaceBelow > 260;

    const top = placeBelow
      ? clamp(targetRect.top + targetRect.height + 14, 12, viewportHeight - 220)
      : clamp(targetRect.top - 206, 12, viewportHeight - 220);

    const left = clamp(
      targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2,
      12,
      viewportWidth - CARD_WIDTH - 12,
    );

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${CARD_WIDTH}px`,
    };
  }, [targetRect]);

  if (!isOpen || !currentStep) return null;

  return (
    <div className="tutorial-layer" role="dialog" aria-modal="true" aria-label="User tutorial">
      {targetRect ? (
        <div
          className="tutorial-spotlight"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
          aria-hidden="true"
        />
      ) : null}

      <div className="tutorial-card" style={cardStyle ?? undefined}>
        <p className="tutorial-step-count">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h2>{currentStep.title}</h2>
        <p>{currentStep.description}</p>

        <div className="tutorial-actions">
          <button type="button" onClick={onClose}>
            Skip tutorial
          </button>
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
          >
            Back
          </button>
          <button
            type="button"
            className="tutorial-next-btn"
            onClick={() => {
              if (isLastStep) {
                onClose();
                return;
              }
              setStepIndex((current) => current + 1);
            }}
          >
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserTutorial;
