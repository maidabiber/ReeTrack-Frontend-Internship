import type { CalendarEvent } from './types'
import { addDays, startOfWeek } from './dateUtils'

function at(day: Date, hour: number, minute = 0): Date {
  const d = new Date(day)
  d.setHours(hour, minute, 0, 0)
  return d
}

/** Sample events anchored to the current week for visual testing. */
export function getMockEvents(): CalendarEvent[] {
  const monday = startOfWeek(new Date())
  const tuesday = addDays(monday, 1)
  const wednesday = addDays(monday, 2)
  const thursday = addDays(monday, 3)
  const friday = addDays(monday, 4)

  return [
    {
      id: '1',
      title: 'Team standup',
      description:
        'Daily sync with the engineering team. Review blockers, sprint progress, and priorities for the day.',
      start: at(monday, 9, 0),
      end: at(monday, 9, 30),
      location: 'Google Meet',
      color: 'purple',
    },
    {
      id: '2',
      title: 'Design review',
      description:
        'Walk through the updated timer screen mockups and calendar component specs with the design team.',
      start: at(monday, 11, 0),
      end: at(monday, 12, 0),
      location: 'Conference Room B',
      color: 'orange',
    },
    {
      id: '3',
      title: 'Client call — Acme Corp',
      description:
        'Quarterly business review. Discuss project timeline, deliverables, and upcoming milestones.',
      start: at(tuesday, 10, 0),
      end: at(tuesday, 11, 30),
      location: 'Zoom',
      color: 'green',
    },
    {
      id: '4',
      title: 'Lunch break',
      start: at(tuesday, 12, 30),
      end: at(tuesday, 13, 30),
      color: 'yellow',
    },
    {
      id: '5',
      title: 'Sprint planning',
      description:
        'Plan the next two-week sprint. Estimate stories, assign owners, and set sprint goals.',
      start: at(wednesday, 9, 0),
      end: at(wednesday, 11, 0),
      location: 'Main office',
      color: 'purple',
    },
    {
      id: '6',
      title: '1:1 with manager',
      description: 'Weekly check-in on career growth, feedback, and team dynamics.',
      start: at(wednesday, 14, 0),
      end: at(wednesday, 14, 45),
      color: 'green',
    },
    {
      id: '7',
      title: 'Code review session',
      description: 'Review open PRs for the calendar integration and timer backend.',
      start: at(thursday, 10, 0),
      end: at(thursday, 10, 30),
      color: 'orange',
    },
    {
      id: '8',
      title: 'Architecture discussion',
      description: 'Overlap with code review — tests column packing in week view.',
      start: at(thursday, 10, 15),
      end: at(thursday, 11, 0),
      color: 'purple',
    },
    {
      id: '9',
      title: 'Focus time',
      description: 'Deep work block — no meetings. Work on the event calendar component.',
      start: at(thursday, 13, 0),
      end: at(thursday, 16, 0),
      color: 'green',
    },
    {
      id: '10',
      title: 'Demo prep',
      description: 'Prepare demo script and slides for Friday stakeholder review.',
      start: at(friday, 9, 30),
      end: at(friday, 10, 30),
      location: 'Desk',
      color: 'yellow',
    },
    {
      id: '11',
      title: 'Stakeholder demo',
      description:
        'Present ReeTrack timer and calendar features to stakeholders. Gather feedback for next iteration.',
      start: at(friday, 14, 0),
      end: at(friday, 15, 0),
      location: 'Board room',
      color: 'purple',
    },
    {
      id: '12',
      title: 'Happy hour',
      start: at(friday, 17, 0),
      end: at(friday, 18, 30),
      location: 'Rooftop bar',
      color: 'orange',
    },
  ]
}
