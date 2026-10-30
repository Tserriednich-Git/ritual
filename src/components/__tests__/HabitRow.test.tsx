import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { HabitWithProgress } from '../../domain/types';
import { HabitRow } from '../HabitRow';

const OPEN_HINT = 'Opens the habit details';
const CHECK_HINT = 'Double tap to check off today';
const UNDO_HINT = 'Double tap to undo today’s check-in';

function row(overrides: Partial<HabitWithProgress> = {}): HabitWithProgress {
  return {
    habit: {
      id: 'h1',
      name: 'Read',
      description: '',
      color: 'teal',
      icon: '📚',
      frequency: { kind: 'times_per_week', target: 3 },
      reminderTime: null,
      position: 0,
      createdAt: 0,
      archivedAt: null,
    },
    dueToday: true,
    completedToday: false,
    stats: {
      streak: { unit: 'day', current: 3, longest: 5 },
      totalCompletions: 12,
      consistency: 0.6,
      lastCompletedDate: '2026-03-28',
    },
    ...overrides,
  };
}

// render and fireEvent are async in @testing-library/react-native v14.
describe('HabitRow', () => {
  it('shows the name, the cadence and the live streak', async () => {
    await render(<HabitRow row={row()} onToggle={jest.fn()} onOpen={jest.fn()} scheme="light" />);
    expect(screen.getByText('Read')).toBeOnTheScreen();
    expect(screen.getByText('3× per week · 3 days streak')).toBeOnTheScreen();
  });

  it('drops the streak clause when nothing is running', async () => {
    const cold = row();
    cold.stats.streak = { unit: 'day', current: 0, longest: 5 };
    await render(<HabitRow row={cold} onToggle={jest.fn()} onOpen={jest.fn()} scheme="light" />);
    expect(screen.getByText('3× per week')).toBeOnTheScreen();
    expect(screen.queryByText(/streak/)).not.toBeOnTheScreen();
  });

  it('keeps the check-in control separate from the navigation target', async () => {
    const onToggle = jest.fn();
    const onOpen = jest.fn();
    await render(<HabitRow row={row()} onToggle={onToggle} onOpen={onOpen} scheme="light" />);

    await fireEvent.press(screen.getByHintText(OPEN_HINT));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByHintText(CHECK_HINT));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('announces a finished day to the screen reader', async () => {
    await render(
      <HabitRow
        row={row({ completedToday: true })}
        onToggle={jest.fn()}
        onOpen={jest.fn()}
        scheme="dark"
      />,
    );
    expect(screen.getByHintText(UNDO_HINT)).toBeChecked();
    expect(screen.queryByHintText(CHECK_HINT)).not.toBeOnTheScreen();
  });
});
