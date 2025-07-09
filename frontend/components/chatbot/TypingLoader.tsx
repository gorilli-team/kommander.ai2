import React from 'react';

const TypingLoader = () => {
  return (
    <div className="typing-loader">
      <div className="dots-container">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
      
      <style jsx>{`
        .typing-loader {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 12px 16px;
          min-height: 40px;
        }

        .dots-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
        }

        .dot {
          height: 8px;
          width: 8px;
          margin-right: 6px;
          border-radius: 50%;
          background-color: #b3d4fc;
          animation: pulse 1.5s infinite ease-in-out;
        }

        .dot:last-child {
          margin-right: 0;
        }

        .dot:nth-child(1) {
          animation-delay: -0.3s;
        }

        .dot:nth-child(2) {
          animation-delay: -0.1s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.1s;
        }

        .dot:nth-child(4) {
          animation-delay: 0.3s;
        }

        .dot:nth-child(5) {
          animation-delay: 0.5s;
        }

        @keyframes pulse {
          0% {
            transform: scale(0.8);
            background-color: #b3d4fc;
            box-shadow: 0 0 0 0 rgba(178, 212, 252, 0.7);
          }

          50% {
            transform: scale(1.2);
            background-color: #6793fb;
            box-shadow: 0 0 0 5px rgba(178, 212, 252, 0);
          }

          100% {
            transform: scale(0.8);
            background-color: #b3d4fc;
            box-shadow: 0 0 0 0 rgba(178, 212, 252, 0.7);
          }
        }
      `}</style>
    </div>
  );
};

export default TypingLoader;
