import { Styles } from 'react-joyride';

export const joyrideStyles: Partial<Styles> = {
  options: {
    arrowColor: 'hsl(240 10% 10%)',
    backgroundColor: 'hsl(240 10% 10%)',
    overlayColor: 'rgba(0, 0, 0, 0.75)',
    primaryColor: 'hsl(262.1 83.3% 57.8%)',
    textColor: 'hsl(0 0% 95%)',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: 12,
    padding: 20,
  },
  tooltipContainer: {
    textAlign: 'left',
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 8,
  },
  tooltipContent: {
    fontSize: 14,
    lineHeight: 1.5,
  },
  buttonNext: {
    backgroundColor: 'hsl(262.1 83.3% 57.8%)',
    borderRadius: 8,
    color: 'white',
    fontSize: 14,
    padding: '8px 16px',
  },
  buttonBack: {
    color: 'hsl(240 5% 64.9%)',
    fontSize: 14,
    marginRight: 8,
  },
  buttonSkip: {
    color: 'hsl(240 5% 64.9%)',
    fontSize: 13,
  },
  buttonClose: {
    color: 'hsl(240 5% 64.9%)',
  },
  spotlight: {
    borderRadius: 8,
  },
};
