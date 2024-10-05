#!/usr/bin/env node

import chalk, { chalkStderr } from "chalk";
import inquirer from "inquirer";
import fs from 'fs/promises';
import path, { resolve } from "path";
import ora, { spinners } from "ora";
import { version } from "os";
import { rejects } from "assert";
import { exec } from "child_process";

async function generateProject() {
  console.log(chalk.blue.bold('\n🚀 Welcome to MongoDB API Generator\n'));
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project Name',
      default: 'my-api'
    },
    {
      type: 'input',
      name: 'modelName',
      message: 'Model Name (e.g., User, Product)',
      default: 'User'
    }
  ]);


  const modelNameLower = answers.modelName.toLowerCase();
  const modelNamePlural = `${modelNameLower}s`;
  answers.modelNameLower = modelNameLower;
  answers.modelNamePlural = modelNamePlural;
  answers.modelNameCapitalized = answers.modelName.charAt(0).toUpperCase() + answers.modelName.slice(1);

  const projectPath = path.join(process.cwd(), answers.projectName);
  const spinner = ora('Creating Project Structure...').start();

  try {
    fs.mkdir(projectPath, { recursive: true });

    const packageJson = {
      name: answers.projectName,
      version: '1.0.0',
      description: '',
      main: "src/index.js",
      scripts: {
        start: 'node src/index.js',
        dev: 'nodemon src/index.js'
      },
      keywords: [],
      author: '',
      license: 'ISC'
    };
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );


    await fs.mkdir(path.join(projectPath, 'src'));
    await fs.mkdir(path.join(projectPath, 'src/routes'));
    await fs.mkdir(path.join(projectPath, 'src/models'));
    await fs.mkdir(path.join(projectPath, 'src/controllers'));
    spinner.succeed('Project Structure Created');
    spinner.start('Generating Template Files...');
    await generateFiles(projectPath, answers);
    spinner.succeed('Template Files Generated');
    spinner.start('Installing Dependencies...')
    process.chdir(projectPath);
    await new Promise((resolve, reject) => {
      exec('npm install express mongoose dotenv cors', (error) => {
        if (error) reject(error);
        resolve();
      });
    });
    spinner.succeed('Dependencies Installed');
    console.log(chalk.green.bold('\n✨ Project created successfully!'));
  }
  catch (error) {
    console.log(chalk.red(error));
  }
}

async function generateFiles(projectPath, answers) {
  const files = {
    'src/index.js': generateIndexFile(answers),
    '.env': generateEnvFile(answers),
    [`src/routes/${answers.modelNameLower}.js`]: generateRouteFile(answers),
    [`src/models/${answers.modelNameLower}.js`]: generateModelFile(answers),
    [`src/controllers/${answers.modelNameLower}.js`]: generateControllerFile(answers)
  };

  for (const [filePath, content] of Object.entries(files)) {
    await fs.writeFile(path.join(projectPath, filePath), content);
  }
}

function generateIndexFile(answers) {
  const { modelNameLower, modelNamePlural } = answers;
  return `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ${modelNameLower}Routes from './routes/${modelNameLower}.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/${modelNamePlural}', ${modelNameLower}Routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;
}

function generateEnvFile(answers) {
  return `PORT=3000\nMONGODB_URI=mongodb://localhost:27017/${answers.projectName}`;
}

function generateRouteFile(answers) {
  const { modelNameLower, modelNameCapitalized } = answers;
  return `import express from 'express';
import { 
  getAll${modelNameCapitalized}s,
  get${modelNameCapitalized}ById,
  create${modelNameCapitalized},
  update${modelNameCapitalized},
  delete${modelNameCapitalized}
} from '../controllers/${modelNameLower}.js';

const router = express.Router();

router.get('/', getAll${modelNameCapitalized}s);
router.get('/:id', get${modelNameCapitalized}ById);
router.post('/', create${modelNameCapitalized});
router.put('/:id', update${modelNameCapitalized});
router.delete('/:id', delete${modelNameCapitalized});

export default router;`;
}

function generateModelFile(answers) {
  const { modelNameLower, modelNameCapitalized } = answers;
  return `import mongoose from 'mongoose';

const ${modelNameLower}Schema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('${modelNameCapitalized}', ${modelNameLower}Schema);`;
}

function generateControllerFile(answers) {
  const { modelNameLower, modelNameCapitalized } = answers;
  return `import ${modelNameCapitalized} from '../models/${modelNameLower}.js';

export const getAll${modelNameCapitalized}s = async (req, res) => {
  try {
    const ${modelNameLower}s = await ${modelNameCapitalized}.find();
    res.json(${modelNameLower}s);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const get${modelNameCapitalized}ById = async (req, res) => {
  try {
    const ${modelNameLower} = await ${modelNameCapitalized}.findById(req.params.id);
    if (${modelNameLower}) {
      res.json(${modelNameLower});
    } else {
      res.status(404).json({ message: '${modelNameCapitalized} not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create${modelNameCapitalized} = async (req, res) => {
  const ${modelNameLower} = new ${modelNameCapitalized}({
    name: req.body.name,
    description: req.body.description
  });

  try {
    const new${modelNameCapitalized} = await ${modelNameLower}.save();
    res.status(201).json(new${modelNameCapitalized});
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const update${modelNameCapitalized} = async (req, res) => {
  try {
    const ${modelNameLower} = await ${modelNameCapitalized}.findById(req.params.id);
    if (${modelNameLower}) {
      ${modelNameLower}.name = req.body.name || ${modelNameLower}.name;
      ${modelNameLower}.description = req.body.description || ${modelNameLower}.description;
      
      const updated${modelNameCapitalized} = await ${modelNameLower}.save();
      res.json(updated${modelNameCapitalized});
    } else {
      res.status(404).json({ message: '${modelNameCapitalized} not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const delete${modelNameCapitalized} = async (req, res) => {
  try {
    const ${modelNameLower} = await ${modelNameCapitalized}.findById(req.params.id);
    if (${modelNameLower}) {
      await ${modelNameLower}.deleteOne();
      res.json({ message: '${modelNameCapitalized} deleted successfully' });
    } else {
      res.status(404).json({ message: '${modelNameCapitalized} not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};`;
}

generateProject().catch(console.error);
