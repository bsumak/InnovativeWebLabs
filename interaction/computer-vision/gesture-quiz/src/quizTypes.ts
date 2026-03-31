export type QuizCategory =
  | 'JavaScript'
  | 'Python'
  | 'HTML'
  | 'CSS'
  | 'React'
  | 'TypeScript';

export type Question = {
  id: number;
  text: string;
  answer: boolean;
};
