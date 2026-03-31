import type { Question, QuizCategory } from './quizTypes';

export const QUIZZES: Record<QuizCategory, Question[]> = {
  JavaScript: [
    { id: 1, text: 'JavaScript is strongly typed.', answer: false },
    { id: 2, text: 'Array.isArray([]) returns true.', answer: true },
    { id: 3, text: 'const prevents object mutation.', answer: false }
  ],
  Python: [
    { id: 1, text: 'Python uses indentation as syntax.', answer: true },
    { id: 2, text: 'Python is a compiled-only language.', answer: false },
    { id: 3, text: 'Lists in Python are mutable.', answer: true }
  ],
  HTML: [
    { id: 1, text: 'HTML is a programming language.', answer: false },
    { id: 2, text: 'The <img> tag can display an image.', answer: true },
    { id: 3, text: 'HTML stands for HyperText Markup Language.', answer: true }
  ],
  CSS: [
    { id: 1, text: 'CSS is used for styling web pages.', answer: true },
    { id: 2, text: 'margin: auto always centers vertically.', answer: false },
    { id: 3, text: 'CSS stands for Cascading Style Sheets.', answer: true }
  ],
  React: [
    { id: 1, text: 'React components can use state.', answer: true },
    { id: 2, text: 'JSX is required to use React.', answer: false },
    { id: 3, text: 'useEffect can handle side effects.', answer: true }
  ],
  TypeScript: [
    { id: 1, text: 'TypeScript is a superset of JavaScript.', answer: true },
    { id: 2, text: 'TypeScript types exist at runtime in the browser.', answer: false },
    { id: 3, text: 'Interfaces can describe the shape of an object.', answer: true },
    { id: 4, text: 'The "any" type disables most type checking.', answer: true },
    { id: 5, text: 'Type aliases can only represent object types.', answer: false }
  ]
};

export const CATEGORY_ORDER: QuizCategory[] = [
  'JavaScript',
  'Python',
  'HTML',
  'CSS',
  'React',
  'TypeScript'
];
