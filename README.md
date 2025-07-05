# LensBridge Frontend

A React frontend application for LensBridge - a media upload platform designed for UTM MSA students to share event photos and videos for potential featuring on social media.

## Features

- 📸 **Media Upload**: Drag-and-drop or click to upload photos and videos
- 🖼️ **Gallery**: Browse and search through community-submitted media
- 📱 **Mobile Responsive**: Optimized for all device sizes
- 🎨 **Modern UI**: Clean, intuitive interface with MSA branding
- ✅ **Form Validation**: Comprehensive form validation and error handling
- 🔒 **Consent Management**: User consent for media usage

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd LensBridgeFrontend
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── Header.jsx      # Navigation header
├── pages/              # Page components
│   ├── Home.jsx        # Landing page
│   ├── Upload.jsx      # Media upload page
│   └── Gallery.jsx     # Media gallery page
├── App.jsx             # Main app component
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## Key Features

### Media Upload
- Drag-and-drop interface for easy file selection
- Support for images (JPG, PNG, GIF) and videos (MP4, MOV, AVI)
- File size limit: 100MB per file
- Real-time file preview
- Form validation with user consent

### Gallery
- Grid layout for media display
- Search and filter functionality
- Featured content highlighting
- Media statistics

### Responsive Design
- Mobile-first approach
- Optimized for tablets and desktops
- Touch-friendly interactions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
