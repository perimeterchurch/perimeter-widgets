import { mountWidget } from '@perimeter-widgets/shared';
import { SermonsApp } from './App';
import styles from './styles.css?inline';

mountWidget({
    elementId: 'perimeter-sermons',
    component: SermonsApp,
    styles,
    defaults: {
        perPage: 12,
    },
});
