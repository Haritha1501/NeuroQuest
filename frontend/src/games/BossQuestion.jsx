import React, { useState } from 'react';
import AnimatedFeedbackMessenger from '../components/common/AnimatedFeedbackMessenger';

const BossQuestion = ({ 
  difficulty = 'easy', 
  question = "What is the core concept we learned today?", 
  options = [], 
  hints = [] 
}) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showHint, setShowHint] = useState(difficulty === 'easy');
  const [hintIndex, setHintIndex] = useState(0);
  const [isCorrect, setIsCorrect] = useState(null);

  const handleSelect = (option) => {
    setSelectedOption(option.id);
    if (option.isCorrect) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
  };

  const handleNextHint = () => {
    if (hintIndex < hints.length - 1) {
      setHintIndex(hintIndex + 1);
    }
  };

  const revealHintManual = () => {
    setShowHint(true);
  };

  const selectedOptionObj = options.find(o => o.id === selectedOption);
  const correctOptionObj = options.find(o => o.isCorrect);

  return (
    <div className="p-6 bg-orange-50 rounded-xl max-w-3xl mx-auto shadow-sm">
      <h2 className="text-2xl font-bold mb-2 text-center text-orange-900">Final Challenge</h2>
      <p className="text-center text-orange-700 mb-8 opacity-80">Take your time. You know this.</p>

      <div className="bg-white p-6 rounded-lg shadow-inner mb-6 border border-orange-100">
        <h3 className="text-xl font-medium text-gray-800 text-center">{question}</h3>
      </div>

      {hints.length > 0 && (
        <div className="mb-6 flex flex-col items-center">
          {!showHint ? (
            <button 
              onClick={revealHintManual}
              className="text-orange-600 hover:text-orange-800 underline text-sm transition-colors"
            >
              Need a hint?
            </button>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg w-full max-w-md">
              <p className="text-yellow-800 text-sm mb-2 font-medium">Hint {hintIndex + 1}:</p>
              <p className="text-yellow-900 italic">{hints[hintIndex]}</p>
              {hintIndex < hints.length - 1 && (
                <button 
                  onClick={handleNextHint}
                  className="mt-2 text-xs bg-yellow-200 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-300 transition-colors"
                >
                  Show another hint
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {options.map((option) => {
          let btnClass = "w-full p-4 text-left rounded-lg border-2 transition-all ";
          
          if (selectedOption === option.id) {
            btnClass += option.isCorrect 
              ? "bg-green-100 border-green-500 text-green-900" 
              : "bg-red-50 border-red-300 text-red-900";
          } else {
            btnClass += "bg-white border-orange-200 hover:border-orange-400 hover:bg-orange-100/50 text-gray-700";
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option)}
              disabled={isCorrect}
              className={btnClass}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {/* Fly-in Bird or Mentor Messenger for Right or Wrong verdict */}
      {isCorrect !== null && (
        <div className="mt-6">
          <AnimatedFeedbackMessenger
            isCorrect={isCorrect}
            feedbackMessage={
              isCorrect
                ? "You conquered the Boss Challenge! Masterful understanding demonstrated!"
                : "Not quite the right answer for this boss question, but mistakes make us smarter!"
            }
            selectedAnswer={selectedOptionObj?.text}
            correctAnswer={correctOptionObj?.text}
            explanation={hints[0] || "Review the core curriculum clues above to conquer this concept!"}
            onClose={() => {
              setIsCorrect(null);
              setSelectedOption(null);
            }}
            onRetry={() => {
              setIsCorrect(null);
              setSelectedOption(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BossQuestion;
