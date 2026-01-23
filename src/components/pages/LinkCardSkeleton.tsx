import React from 'react';

// Skeleton loader for link cards
export const LinkCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
            <div className="flex items-start gap-3">
                <div className="w-16 h-16 bg-slate-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                    <div className="flex gap-2 mt-3">
                        <div className="h-5 w-16 bg-indigo-100 rounded" />
                        <div className="h-5 w-12 bg-slate-100 rounded" />
                        <div className="h-5 w-12 bg-slate-100 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SkeletonListProps {
    count?: number;
}

export const LinkListSkeleton: React.FC<SkeletonListProps> = ({ count = 4 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <LinkCardSkeleton key={i} />
            ))}
        </>
    );
};

export default LinkCardSkeleton;
