const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('<h1>Hello World</h1><p>Project is running!</p>');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
