import css from './styles.css?inline';
import { autoMount, ensureGlobal } from '@perimeter/widget-runtime';
import widget from './widget';

widget.version = __PERIMETER_WIDGET_VERSION__;
ensureGlobal(widget, css);
autoMount(widget, css);
