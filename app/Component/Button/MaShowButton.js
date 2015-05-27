import React from 'react';
import {Link} from 'react-router';

class MaShowButton extends React.Component {
    render() {
        let size = 'btn-' + (this.props.size ? this.props.size : 'xs'),
            className = 'btn btn-default ' + size,
            params = {
                entity: this.props.entity.name(),
                id: this.props.entry.identifierValue
            };

        return (
            <Link className={className} to="show" params={params}>
                <span className="glyphicon glyphicon-eye-open" aria-hidden="true"></span>&nbsp;{this.props.label || 'Show'}
            </Link>
        );
    }
}

MaShowButton.propTypes = {
    entity: React.PropTypes.object.isRequired,
    entry: React.PropTypes.object.isRequired,
    size: React.PropTypes.string,
    label: React.PropTypes.string
};

export default MaShowButton;