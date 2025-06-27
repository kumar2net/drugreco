const app = require('./functions/api');
const port = 3001;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 