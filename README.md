# RehearsalHub

A comprehensive dance rehearsal scheduling and management system built with Next.js. RehearsalHub helps dance studios manage routines, dancers, schedules, and resources efficiently with an intuitive calendar-based interface.

## Features

### 🎭 Routine Management
- Create and manage dance routines with details like song title, duration, notes, and color coding
- Assign routines to teachers, genres, and skill levels
- Track scheduled hours per routine
- Mark routines as active/inactive
- Associate multiple dancers with each routine

### 👥 Dancer Management
- Comprehensive dancer profiles with contact information, age, and personal details
- Import dancers from CSV files
- Batch operations for managing multiple dancers
- View dancer schedules and assigned routines

### 📅 Calendar Scheduling
- Interactive calendar grid with drag-and-drop scheduling
- Multi-room support with configurable room visibility
- Time-based scheduling with conflict detection
- Recurring schedule support (weekly patterns)
- Visual timeline with color-coded routines
- Filter schedules by skill level

### ⚠️ Conflict Detection
- Automatic detection of room conflicts (double-booking)
- Dancer conflict detection (same dancer scheduled in multiple routines at the same time)
- Visual warnings with detailed conflict information
- Option to proceed despite conflicts

### 🏢 Resource Management
- Manage multiple rehearsal rooms/studios
- Configure room capacity and equipment
- Set active/inactive room status
- Customize visible rooms in calendar view

### 👨‍🏫 Teacher & Category Management
- Manage teachers with contact information
- Organize routines by genre (Jazz, Ballet, Hip-Hop, etc.)
- Skill level management with color coding
- Settings page for managing all metadata

### 📧 Communication & Export
- Email schedules to dancers
- Export schedules to PDF with date range filtering
- Level-based schedule filtering for exports

### 💾 Data Persistence
- PostgreSQL database with Prisma ORM
- Real-time data synchronization
- Unsaved changes tracking with warnings
- Batch save operations for schedule changes

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **UI Libraries**:
  - React DnD (Drag and Drop)
  - Framer Motion (Animations)
  - React Hot Toast (Notifications)
  - Lucide React (Icons)
- **PDF Generation**: html2pdf.js
- **Backend**: Next.js API Routes

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Environment variables configured (see Setup)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rehearsal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/rehearsalhub?schema=public"
   ```
   
   Replace with your PostgreSQL connection string.

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # (Optional) Seed the database with sample data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (includes Prisma Client generation)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Create and apply database migrations
- `npm run db:generate` - Generate Prisma Client
- `npm run db:seed` - Seed database with sample data

## Database Setup

### Initial Setup

1. **Create a PostgreSQL database**
   ```sql
   CREATE DATABASE rehearsalhub;
   ```

2. **Run migrations**
   ```bash
   npm run db:migrate
   ```
   This will create all necessary tables based on the Prisma schema.

3. **Seed the database (optional)**
   ```bash
   npm run db:seed
   ```
   This populates the database with sample data for testing.

### Schema Overview

The database includes the following main models:
- **Teacher** - Dance instructors
- **Genre** - Dance genres (Jazz, Ballet, etc.)
- **Level** - Skill levels with color coding
- **Dancer** - Dancer profiles
- **Room** - Rehearsal rooms/studios
- **Routine** - Dance routines
- **ScheduledRoutine** - Scheduled rehearsal instances

See `prisma/schema.prisma` for the complete schema definition.

## Development Workflow

### Making Database Changes

When modifying the Prisma schema:

1. **Stop the dev server** (Ctrl+C)
2. **Edit `prisma/schema.prisma`**
3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```
   This automatically creates a migration, applies it, and regenerates Prisma Client.
4. **Restart the dev server:**
   ```bash
   npm run dev
   ```

> **Note**: On Windows, Prisma Client generation may fail if the dev server is running due to file locking. Always stop the server before running migrations.

See `DEVELOPMENT_WORKFLOW.md` for more details.

## Project Structure

```
rehearsal/
├── app/
│   ├── api/              # API routes
│   │   ├── dancers/      # Dancer CRUD operations
│   │   ├── routines/     # Routine CRUD operations
│   │   ├── scheduled/    # Schedule management
│   │   ├── teachers/     # Teacher management
│   │   ├── genres/       # Genre management
│   │   ├── levels/       # Level management
│   │   └── rooms/        # Room management
│   ├── components/       # React components
│   │   ├── calendar/     # Calendar grid components
│   │   ├── dancers/      # Dancer list components
│   │   ├── modals/       # Modal dialogs
│   │   ├── sidebar/      # Sidebar components
│   │   └── common/       # Shared components
│   ├── data/             # Mock data (for development)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Library configurations
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── page.tsx          # Main application page
│   ├── dancers/          # Dancers management page
│   └── settings/         # Settings page
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Database migrations
│   └── seed.ts           # Database seed script
├── public/               # Static assets
└── README.md            # This file
```

## Key Features Explained

### Drag and Drop Scheduling

- Drag routines from the sidebar onto calendar time slots
- Choose between single or recurring schedules
- Automatic conflict detection before scheduling

### Conflict Detection

The system detects two types of conflicts:

1. **Room Conflicts**: Multiple routines scheduled in the same room at overlapping times
2. **Dancer Conflicts**: A dancer is scheduled in multiple routines at the same time

Conflicts are shown in a modal with details, allowing you to proceed or cancel.

### Unsaved Changes Tracking

- The system tracks all schedule changes locally
- A "Save Changes" button appears when there are unsaved modifications
- Browser warning prevents accidental navigation away with unsaved changes

### CSV Import

Import dancers from CSV files with the following columns:
- Name (required)
- Email
- Age
- Phone
- Birthday
- Gender
- Classes (comma-separated)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues, questions, or contributions, please contact the development team.
