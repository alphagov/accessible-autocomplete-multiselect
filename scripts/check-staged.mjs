import chalk from 'chalk'
import * as cp from 'child_process'

cp.exec('git diff --name-only dist/', (err, stdout) => {
  if (err) {
    console.log(chalk.red('ERROR:'), err)
    return process.exit(1)
  }
  if (stdout.toString().length) {
    console.log(chalk.red('ERROR:'), 'There are unstaged changes in `dist/` after running `npm run build`. Please commit them.')
    return process.exit(1)
  }
  process.exit()
})
