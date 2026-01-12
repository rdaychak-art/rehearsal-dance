'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
	message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
	return (
		<div 
			className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center"
			onClick={(e) => e.stopPropagation()}
			onMouseDown={(e) => e.stopPropagation()}
			onMouseUp={(e) => e.stopPropagation()}
			style={{ pointerEvents: 'all' }}
		>
			<div className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-5 shadow-lg">
				<Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
				{message ? (
					<p className="text-sm text-gray-700">{message}</p>
				) : null}
			</div>
		</div>
	);
};


