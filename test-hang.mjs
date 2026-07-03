import { spawn } from 'child_process';
const p = spawn('node', ['--trace-sigint', './node_modules/@11ty/eleventy/cmd.cjs'], {stdio: 'inherit'});
setTimeout(() => {
  console.log("Sending SIGINT to eleventy");
  p.kill('SIGINT');
}, 4000);
