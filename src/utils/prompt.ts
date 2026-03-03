import readline from 'readline';
import { stdin as input, stdout as output } from 'process';

export async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({ input, output });

  try {
    const suffix = defaultValue ? ` (${defaultValue})` : '';
    const response = await new Promise<string>((resolve) => {
      rl.question(`${question}${suffix}: `, (answer) => resolve(answer.trim()));
    });

    if (!response && defaultValue) {
      return defaultValue;
    }

    return response;
  } finally {
    rl.close();
  }
}
