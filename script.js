document.addEventListener('DOMContentLoaded', () => {
  // --- "ONE VIEW PER USER" LOGIC ---
  
  // THE FIX: I've changed the key name. This forces the browser to start fresh.
  const VIEW_COUNTER_KEY = 'prodigyLifeViewCounter_v1'; 
  const BASE_VIEWS = 0; 

  // Get the data from localStorage
  let viewData = JSON.parse(localStorage.getItem(VIEW_COUNTER_KEY));

  // If no data exists under the new key, it's a brand new visitor
  if (!viewData) {
    viewData = {
      totalViews: BASE_VIEWS + 1, // Add this user's first view (will be 1)
      hasContributed: true         // Set the flag
    };
  } else if (!viewData.hasContributed) {
    viewData.totalViews += 1;
    viewData.hasContributed = true;
  }
  
  // Save the updated data back to localStorage
  localStorage.setItem(VIEW_COUNTER_KEY, JSON.stringify(viewData));

  // Update the view count on the page
  document.getElementById('viewCount').textContent = `${viewData.totalViews} views`;


  // --- GRID BACKGROUND LOGIC (UNCHANGED) ---
  const gridContainer = document.getElementById('grid-container');
  const SQUARE_SIZE = 50;
  let squares = [];

  function createGrid() {
    gridContainer.innerHTML = '';
    squares = [];
    const cols = Math.ceil(window.innerWidth / SQUARE_SIZE);
    const rows = Math.ceil(window.innerHeight / SQUARE_SIZE);

    gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (let i = 0; i < cols * rows; i++) {
      const square = document.createElement('div');
      square.classList.add('grid-item');
      gridContainer.appendChild(square);
      squares.push(square);
    }
  }

  document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    squares.forEach(square => {
      const rect = square.getBoundingClientRect();
      const squareX = rect.left + rect.width / 2;
      const squareY = rect.top + rect.height / 2;

      const distance = Math.sqrt(Math.pow(mouseX - squareX, 2) + Math.pow(mouseY - squareY, 2));
      const maxDistance = 250;
      
      if (distance < maxDistance) {
        const opacity = 1 - (distance / maxDistance);
        square.style.backgroundColor = `rgba(255, 77, 77, ${opacity * 0.4})`;
        square.style.boxShadow = `0 0 15px rgba(255, 77, 77, ${opacity * 0.5})`;
      } else {
        square.style.backgroundColor = 'transparent';
        square.style.boxShadow = 'none';
      }
    });
  });
  
  setInterval(() => {
      if (squares.length === 0) return;
      const randomIndex = Math.floor(Math.random() * squares.length);
      const randomSquare = squares[randomIndex];
      if (randomSquare.style.backgroundColor === 'transparent' || !randomSquare.style.backgroundColor) {
        randomSquare.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
        setTimeout(() => {
          randomSquare.style.backgroundColor = 'transparent';
        }, 1500);
      }
  }, 100);

  createGrid();
  window.addEventListener('resize', createGrid);
});