import './style.css';
import { PokerGame } from './PokerGame';
import { UI } from './UI';

const game = new PokerGame(3); // You + 3 AI opponents
const ui = new UI(game);

// Wire up the game phase changes to refresh strength
game.on((evt) => {
  if (evt.type === 'community' || evt.type === 'deal') {
    setTimeout(() => ui.runStrengthUpdate(), 100);
  }
});

ui.renderAISeats_init();
ui.init();
