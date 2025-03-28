import React from 'react';

export default function Layout({ children }) {
  // Remove all toast containers on mount
  React.useEffect(() => {
    const removeToastContainers = () => {
      const toastContainers = document.querySelectorAll('.fixed.top-0.z-\\[100\\]');
      toastContainers.forEach(container => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      });
    };
    
    // Run immediately and periodically
    removeToastContainers();
    const interval = setInterval(removeToastContainers, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}