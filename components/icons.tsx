

import React from 'react';

export const LoadingSpinner: React.FC = () => (
    <svg 
        className="animate-spin h-12 w-12 text-neutral-400" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
    >
        <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
        ></circle>
        <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
    </svg>
);

export const BasicGridOverlay: React.FC = () => (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
        {/* Vertical lines */}
        <line x1="25" y1="0" x2="25" y2="100" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
        <line x1="75" y1="0" x2="75" y2="100" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
        {/* Horizontal lines */}
        <line x1="0" y1="33.33" x2="100" y2="33.33" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
        <line x1="0" y1="66.67" x2="100" y2="66.67" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
    </svg>
);

const xCoords = [0, 25, 50, 75];
const yCoords = [0, 50];

export const TriadicGridOverlay: React.FC = () => (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
        {/* Main grid lines (2 rows, 4 columns) */}
        <line x1="25" y1="0" x2="25" y2="100" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
        <line x1="75" y1="0" x2="75" y2="100" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />

        {/* Diagonals in each cell */}
        {yCoords.map(y => 
            xCoords.map(x => (
                <React.Fragment key={`${x}-${y}`}>
                    <line 
                        x1={x} y1={y} 
                        x2={x + 25} y2={y + 50} 
                        stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" 
                    />
                    <line 
                        x1={x} y1={y + 50} 
                        x2={x + 25} y2={y} 
                        stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" 
                    />
                </React.Fragment>
            ))
        )}
    </svg>
);

const GOLDEN_RATIO = 1.61803398875;
const P1 = 100 / (GOLDEN_RATIO + 1); // ~38.2
const P2 = 100 - P1; // ~61.8

const SAFE_AREA_Y_START = 12.87; 
const SAFE_AREA_Y_END = 87.13;
const SAFE_AREA_HEIGHT = SAFE_AREA_Y_END - SAFE_AREA_Y_START;

const GOLDEN_Y1 = SAFE_AREA_Y_START + (P1 / 100) * SAFE_AREA_HEIGHT;
const GOLDEN_Y2 = SAFE_AREA_Y_START + (P2 / 100) * SAFE_AREA_HEIGHT;

export const BasicGoldenRatioGridOverlay: React.FC = () => (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
        <line x1={P1} y1={SAFE_AREA_Y_START} x2={P1} y2={SAFE_AREA_Y_END} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
        <line x1={P2} y1={SAFE_AREA_Y_START} x2={P2} y2={SAFE_AREA_Y_END} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
        <line x1="0" y1={GOLDEN_Y1} x2="100" y2={GOLDEN_Y1} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
        <line x1="0" y1={GOLDEN_Y2} x2="100" y2={GOLDEN_Y2} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
    </svg>
);

export const TriadicGoldenRatioGridOverlay: React.FC = () => {
    const xPoints = [0, P1, P2];
    const yPoints = [SAFE_AREA_Y_START, GOLDEN_Y1, GOLDEN_Y2];
    const widths = [P1, P2 - P1, 100 - P2];
    const heights = [GOLDEN_Y1 - SAFE_AREA_Y_START, GOLDEN_Y2 - GOLDEN_Y1, SAFE_AREA_Y_END - GOLDEN_Y2];

    return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line x1={P1} y1={SAFE_AREA_Y_START} x2={P1} y2={SAFE_AREA_Y_END} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
            <line x1={P2} y1={SAFE_AREA_Y_START} x2={P2} y2={SAFE_AREA_Y_END} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
            <line x1="0" y1={GOLDEN_Y1} x2="100" y2={GOLDEN_Y1} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
            <line x1="0" y1={GOLDEN_Y2} x2="100" y2={GOLDEN_Y2} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
            {yPoints.map((y, i) =>
                xPoints.map((x, j) => (
                    <React.Fragment key={`${x}-${y}`}>
                        <line 
                            x1={x} y1={y} 
                            x2={x + widths[j]} y2={y + heights[i]} 
                            stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" 
                        />
                        <line 
                            x1={x} y1={y + heights[i]} 
                            x2={x + widths[j]} y2={y} 
                            stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" 
                        />
                    </React.Fragment>
                ))
            )}
        </svg>
    );
};

export const DiceIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zM4 9a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm12 0a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM8 15a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
      <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm1 2a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V4z" clipRule="evenodd" />
    </svg>
);

export const SettingsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export const EditIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
);

export const AddToStoryIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

export const ClearIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const PinIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9.243 3.03a1 1 0 01.757 1.628L8.35 8.125l2.48 2.48a1 1 0 010 1.414l-2.48 2.48 3.465 3.465a1 1 0 01-1.414 1.414l-3.465-3.465-2.48 2.48a1 1 0 01-1.414 0l-2.48-2.48-3.465 3.465a1 1 0 01-1.414-1.414l3.465-3.465L1.628 9.878a1 1 0 011.628-.757L6.875 11.65l2.48-2.48-1.57-4.322a1 1 0 01.757-1.628z" clipRule="evenodd" />
    </svg>
);

export const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

export const UseAsGuideIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fillRule="evenodd" d="M.458 10C3.732 5.943 7.522 4 10 4c2.478 0 6.268 1.943 9.542 6-.27.322-.533.64-.793.953l-1.008-1.008A7.514 7.514 0 0010 7.5c-1.92 0-3.692.73-5.02 1.953l-1.114 1.114A11.53 11.53 0 00.458 10zM10 16c-2.478 0-6.268-1.943-9.542-6 .27-.322.533.64.793-.953l1.008 1.008A7.514 7.514 0 0010 12.5c1.92 0 3.692-.73 5.02-1.953l1.114-1.114c.26-.313.522-.63.793-.953C16.268 14.057 12.478 16 10 16z" clipRule="evenodd" />
    </svg>
);

export const UpscaleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
);

export const CloseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const CharacterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

export const LoreIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

export const LibraryIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
);

export const WritersRoomIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

export const ShuffleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l3 3-3 3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h7.5a3.5 3.5 0 010 7H6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5l-3-3 3-3" />
    </svg>
);

export const SwapIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);

export const LayersIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.535l-8.485-4.243L12 3l8.485 4.292L12 11.535z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5l8 4 8-4M4 15.5l8 4 8-4" />
    </svg>
);

export const DashboardIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

export const GridIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 4v16m4-16v16M4 10h16M4 14h16" />
    </svg>
);

export const BlenderIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

export const FaceSparkleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1.5a4.5 4.5 0 016-4.243m5.5-4.243v2.172a2 2 0 001.026 1.732 2 2 0 002.34-.364l.633-.633a2 2 0 00-2.828-2.828l-.633.633a2 2 0 00-.364 2.34z" />
    </svg>
);

export const PhotoRealismIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

export const StoryboardIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

export const VideoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

export const ScriptIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

export const AutomationIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
       <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

export const AgentActionIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6h-1a1 1 0 010-2h1V3a1 1 0 011-1zM11 13a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-4 4a1 1 0 011-1h2a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

export const ChevronLeftIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

export const ChevronRightIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);