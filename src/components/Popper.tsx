import {
  Popper as MuiPopper,
  Theme,
  TypeBackground,
  styled,
} from "@mui/material";

// From https://github.com/mui/material-ui/blob/master/docs/data/material/components/popper/ScrollPlayground.js

const Popper = styled(MuiPopper, {
  shouldForwardProp: (prop) => prop !== "arrow" && prop !== "backgroundColor",
})(
  ({
    theme = { palette: { background: { paper: "white" } } },
    arrow,
    backgroundColor,
  }: {
    theme?: Theme | { palette: { background: Partial<TypeBackground> } };
    arrow: boolean;
    backgroundColor?: string;
  }) => ({
    zIndex: 1,
    /// start our css aditions
    "& > div > .MuiPaper-root": {
      backgroundColor: backgroundColor || theme.palette.background.paper,
    },
    /// end our css additions
    "& > div": {
      position: "relative",
    },
    '&[data-popper-placement*="bottom"]': {
      "& > div": {
        marginTop: arrow ? 2 : 0,
      },
      "& .MuiPopper-arrow": {
        top: 0,
        left: 0,
        marginTop: "-0.9em",
        width: "3em",
        height: "1em",
        "&::before": {
          borderWidth: "0 1em 1em 1em",
          borderColor: `transparent transparent ${backgroundColor || theme.palette.background.paper} transparent`,
        },
      },
    },
    '&[data-popper-placement*="top"]': {
      "& > div": {
        marginBottom: arrow ? 2 : 0,
      },
      "& .MuiPopper-arrow": {
        bottom: 0,
        left: 0,
        marginBottom: "-0.9em",
        width: "3em",
        height: "1em",
        "&::before": {
          borderWidth: "1em 1em 0 1em",
          borderColor: `${backgroundColor || theme.palette.background.paper} transparent transparent transparent`,
        },
      },
    },
    '&[data-popper-placement*="right"]': {
      "& > div": {
        marginLeft: arrow ? 2 : 0,
      },
      "& .MuiPopper-arrow": {
        left: 0,
        marginLeft: "-0.9em",
        height: "3em",
        width: "1em",
        "&::before": {
          borderWidth: "1em 1em 1em 0",
          borderColor: `transparent ${backgroundColor || theme.palette.background.paper} transparent transparent`,
        },
      },
    },
    '&[data-popper-placement*="left"]': {
      "& > div": {
        marginRight: arrow ? 2 : 0,
      },
      "& .MuiPopper-arrow": {
        right: 0,
        marginRight: "-0.9em",
        height: "3em",
        width: "1em",
        "&::before": {
          borderWidth: "1em 0 1em 1em",
          borderColor: `transparent transparent transparent ${backgroundColor || theme.palette.background.paper}`,
        },
      },
    },
  }),
);

const Arrow = styled("div")({
  position: "absolute",
  fontSize: 7,
  width: "3em",
  height: "3em",
  "&::before": {
    content: '""',
    margin: "auto",
    display: "block",
    width: 0,
    height: 0,
    borderStyle: "solid",
  },
});

export { Arrow };
export default Popper;
