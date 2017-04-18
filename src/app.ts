import * as dotenv from 'dotenv';
import run from './run';
import twitter from './twitter';

dotenv.config();
run(() => twitter());
