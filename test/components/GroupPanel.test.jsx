import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import GroupPanel from '../../src/components/GroupPanel.jsx';

const mkData = () => ({
  timestamps: [0, 1, 2],
  signals: [
    { name: 'S0', values: [1, 2, 3], isDigital: false },
    { name: 'S1', values: [4, 5, 6], isDigital: false },
  ],
  tagNames: ['Tag0', 'Tag1'],
});

const mkProps = (overrides = {}) => ({
  groupIdx: 1,
  label: 'Group A',
  color: '#39f',
  signals: mkData().signals,
  sigColors: ['#39f', '#f93'],
  visible: [true, true],
  groups: [1, 1],
  cursorValues: null,
  cursor2Values: null,
  deltaMode: false,
  metadata: {},
  data: mkData(),
  onDrop: vi.fn(),
  onToggleVisible: vi.fn(),
  onToggleGroup: vi.fn(),
  onSetGroupName: vi.fn(),
  onStyleChange: vi.fn(),
  signalStyles: {},
  referenceOverlays: [],
  derivedConfigs: {},
  onEditDerived: vi.fn(),
  onDeleteDerived: vi.fn(),
  onAddOverlay: vi.fn(),
  onUpdateOverlay: vi.fn(),
  onDeleteOverlay: vi.fn(),
  theme: 'dark',
  getDisplayName: (i) => `Tag${i}`,
  onRenameDisplay: vi.fn(),
  ...overrides,
});

describe('GroupPanel', () => {
  it('renders the group label', () => {
    const { container } = render(<GroupPanel {...mkProps()} />);
    expect(container.textContent).toContain('Group A');
  });

  it('renders signal display names', () => {
    const { container } = render(<GroupPanel {...mkProps()} />);
    expect(container.textContent).toContain('Tag0');
    expect(container.textContent).toContain('Tag1');
  });

  it('calls onDrop with signal index and group index when a signal is dropped', () => {
    const onDrop = vi.fn();
    const { container } = render(<GroupPanel {...mkProps({ onDrop })} />);
    const dropTarget = container.firstChild;
    const dt = { getData: vi.fn(() => '0'), dropEffect: 'move' };
    fireEvent.drop(dropTarget, { dataTransfer: dt });
    expect(onDrop).toHaveBeenCalledWith(0, 1);
  });

  it('renders empty state when no signals are in the group', () => {
    const props = mkProps({ groups: [2, 2] }); // both signals in group 2, not 1
    const { container } = render(<GroupPanel {...props} />);
    // Group header still renders, but no signal cards
    expect(container.textContent).toContain('Group A');
    expect(container.textContent).not.toContain('Tag0');
  });

  it('shows drag-over hint when dragging over an empty group', () => {
    const props = mkProps({ groups: [2, 2] });
    const { container } = render(<GroupPanel {...props} />);
    const dropTarget = container.firstChild;
    fireEvent.dragOver(dropTarget, { dataTransfer: { dropEffect: 'move' } });
    expect(container.textContent).toContain('Drop here');
  });
});
