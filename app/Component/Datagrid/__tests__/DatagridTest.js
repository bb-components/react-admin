jest.autoMockOff();
jest.setMock('../../../Stores/DatagridStore', require('../__mocks__/DatagridStore'));
jest.setMock('../../../Actions/DatagridActions', require('../__mocks__/DatagridActions'));

var React = require('react/addons');
var TestUtils = React.addons.TestUtils;
var Datagrid = require('../Datagrid');
var routerWrapper = require('../../../Test/RouterWrapper');

function getDatagrid(fields, view, router) {
    return routerWrapper(() => <Datagrid fields={fields} view={view} router={router} />);
}

describe('Datagrid', () => {
    var view;
    var router;

    beforeEach(() => {
        view = view = {
            listActions: () => [],
            perPage: () => 10,
            name: () => 'myView',
            entity: {
                name: () => 'myEntity'
            }
        };

        router = {
            getCurrentQuery: () => {
                return 1;
            }
        };
    });

    describe('Column headers', () => {
        it('should set header with correct label for each field, plus an empty header for actions', () => {
            var fields = {
                'id': { label: () => '#' },
                'title': { label: () => 'Title' },
                'created_at': { label: () => 'Creation date' }
            };

            var datagrid = getDatagrid(fields, view, router);
            datagrid = React.findDOMNode(datagrid);

            var headers = [].slice.call(datagrid.querySelectorAll('thead th')).map(h => h.textContent);
            expect(headers).toEqual(['#', 'Title', 'Creation date', '']);
            expect(true).toEqual(true);
        });

        it('should send `sort` event to datagrid when clicking on header', () => {
            var fields = {
                'id': { label: () => '#' }
            };

            var DatagridActions = require('../../../Actions/DatagridActions');

            var datagrid = getDatagrid(fields, view, router);
            var datagridNode = React.findDOMNode(datagrid);
            var header = datagridNode.querySelector('thead th a');
            TestUtils.Simulate.click(header);

            expect(DatagridActions.sort).toBeCalled();
        });
    });
});
