import React from 'react';

export const Logo = ({ className = "w-16 h-16" }: { className?: string }) => (
  <img 
    src="https://i.ibb.co/ztcvVNt/logo.jpg" 
    alt="JoraBase Logo" 
    className={`${className} object-contain pointer-events-none select-none`}
    referrerPolicy="no-referrer"
    draggable="false"
  />
);
