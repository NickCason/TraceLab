import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import TutorialOverlay from '../../src/components/tutorial/TutorialOverlay.jsx';
import { THEMES } from '../../src/constants/theme.js';

const t = THEMES.dark;

afterEach(() => cleanup());

describe('TutorialOverlay step lifecycle', () => {
  it('calls onEnter for the first step when opened', () => {
    const onEnterStep1 = vi.fn();
    const onEnterStep2 = vi.fn();
    const stepsOverride = [
      { target: null, title: 'A', desc: 'a', svg: '', onEnter: onEnterStep1 },
      { target: null, title: 'B', desc: 'b', svg: '', onEnter: onEnterStep2 },
    ];
    render(
      <TutorialOverlay
        open
        onClose={vi.fn()}
        t={t}
        theme="dark"
        stepCtx={{ openProjectMenu: vi.fn(), closeProjectMenu: vi.fn() }}
        stepsOverride={stepsOverride}
      />
    );
    expect(onEnterStep1).toHaveBeenCalledTimes(1);
    expect(onEnterStep2).not.toHaveBeenCalled();
  });

  it('calls onLeave for current step and onEnter for next on advance', () => {
    const onLeaveStep1 = vi.fn();
    const onEnterStep2 = vi.fn();
    const stepsOverride = [
      { target: null, title: 'A', desc: 'a', svg: '', onLeave: onLeaveStep1 },
      { target: null, title: 'B', desc: 'b', svg: '', onEnter: onEnterStep2 },
    ];
    const { getByText } = render(
      <TutorialOverlay
        open
        onClose={vi.fn()}
        t={t}
        theme="dark"
        stepCtx={{ openProjectMenu: vi.fn(), closeProjectMenu: vi.fn() }}
        stepsOverride={stepsOverride}
      />
    );
    act(() => { fireEvent.click(getByText(/Next/i)); });
    expect(onLeaveStep1).toHaveBeenCalledTimes(1);
    expect(onEnterStep2).toHaveBeenCalledTimes(1);
  });

  it('passes stepCtx to onEnter and onLeave', () => {
    const onEnter = vi.fn();
    const ctx = { openProjectMenu: vi.fn(), closeProjectMenu: vi.fn() };
    const stepsOverride = [{ target: null, title: 'A', desc: 'a', svg: '', onEnter }];
    render(
      <TutorialOverlay
        open onClose={vi.fn()} t={t} theme="dark"
        stepCtx={ctx} stepsOverride={stepsOverride}
      />
    );
    expect(onEnter).toHaveBeenCalledWith(ctx);
  });
});
